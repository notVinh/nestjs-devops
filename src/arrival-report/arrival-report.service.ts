import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ArrivalReport } from './entities/arrival-report.entity';
import { Employee } from 'src/employee/entities/employee.entity';
import { CreateArrivalReportDto } from './dto/create-arrival-report.dto';
import { PaginationHelper } from 'src/utils/pagination.helper';
import {
  IPaginationOptions,
  IPaginationResult,
} from 'src/utils/types/pagination-options.type';
import { ARRIVAL_REPORT_STATUS } from 'src/utils/constant';
import { NotificationService } from 'src/notification/notification.service';
import { NOTIFICATION_TYPE } from 'src/notification/constants/notification-type.constant';
import { ReportDepartureDto } from './dto/report-departure.dto';

@Injectable()
export class ArrivalReportService {
  private readonly context = 'ArrivalReportService';

  constructor(
    @InjectRepository(ArrivalReport)
    private arrivalReportRepository: Repository<ArrivalReport>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly notificationService: NotificationService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
  ) {}

  // Helper methods để log với context
  private log(message: string) {
    this.logger.info(message, { context: this.context });
  }

  private debug(message: string) {
    this.logger.debug(message, { context: this.context });
  }

  private warn(message: string) {
    this.logger.warn(message, { context: this.context });
  }

  private error(message: string, trace?: any) {
    if (trace) {
      this.logger.error(message, {
        context: this.context,
        trace: trace?.stack || trace,
      });
    } else {
      this.logger.error(message, { context: this.context });
    }
  }

  // Nhân viên tạo báo cáo đã đến
  async create(
    employeeId: number,
    createDto: CreateArrivalReportDto
  ): Promise<ArrivalReport> {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Xử lý checkEmployeeIds (ưu tiên) hoặc checkEmployeeId (legacy)
    // Lưu ý: Báo cáo đến nhà máy không cần duyệt, chỉ gửi thông báo cho những người được chọn
    const checkEmployeeIds = createDto.checkEmployeeIds?.length
      ? createDto.checkEmployeeIds
      : createDto.checkEmployeeId
        ? [createDto.checkEmployeeId]
        : [];

    // Status luôn là 'arrived' khi tạo báo cáo (không cần chờ duyệt)
    const arrivalReport = this.arrivalReportRepository.create({
      factoryId: createDto.factoryId || 0,
      employeeId: employeeId,
      companyName: createDto.companyName || '',
      arrivalDate: today,
      arrivalTime: now,
      arrivalLocation: createDto.arrivalLocation || undefined,
      note: createDto.note || undefined,
      status: ARRIVAL_REPORT_STATUS.ARRIVED as 'arrived',
      checkEmployeeId: checkEmployeeIds[0] || undefined, // Legacy: lưu người đầu tiên
      checkEmployeeIds: checkEmployeeIds.length > 0 ? checkEmployeeIds : undefined,
      photoUrls: createDto.photoUrls || undefined,
    });

    const savedReport = await this.arrivalReportRepository.save(arrivalReport);

    // Gửi notification cho người kiểm tra (nếu có)
    if (checkEmployeeIds.length > 0) {
      try {
        const employee = await this.employeeRepository.findOne({
          where: { id: employeeId },
          relations: ['user'],
        });

        const checkEmployees = await this.employeeRepository.find({
          where: checkEmployeeIds.map(id => ({ id })),
          relations: ['user'],
        });

        const checkUserIds = checkEmployees
          .filter(ce => ce?.userId)
          .map(ce => ce.userId);

        if (checkUserIds.length > 0 && employee?.user?.fullName) {
          await this.notificationService.sendNotificationToMultipleUsers(
            checkUserIds,
            'Báo cáo đã đến mới',
            `${employee.user.fullName} đã báo cáo đến ${
              createDto.companyName || 'công ty'
            }`,
            NOTIFICATION_TYPE.ARRIVAL_REPORT_CREATED,
            savedReport.id,
            {
              employeeName: employee.user.fullName,
              companyName: createDto.companyName || '',
              arrivalTime: now.toISOString(),
              arrivalLocation: createDto.arrivalLocation,
            }
          );
        }
      } catch (error) {
        this.error('Error sending notification:', error);
        // Không throw error để không ảnh hưởng đến việc tạo arrival report
      }
    }

    return savedReport;
  }

  // Nhân viên báo cáo rời (check-out)
  async reportDeparture(
    employeeId: number,
    dto: ReportDepartureDto
  ): Promise<ArrivalReport> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Lấy báo cáo đến trong ngày (hoặc theo id nếu truyền vào)
    const arrivalReport =
      dto.arrivalReportId != null
        ? await this.arrivalReportRepository.findOne({
            where: { id: dto.arrivalReportId, employeeId },
          })
        : await this.arrivalReportRepository.findOne({
            where: {
              employeeId,
              factoryId: dto.factoryId,
              arrivalDate: today,
            },
          });

    if (!arrivalReport) {
      throw new NotFoundException('Không tìm thấy báo cáo đến trong ngày');
    }

    if (arrivalReport.departureTime) {
      throw new NotFoundException('Báo cáo này đã được báo về trước đó');
    }

    const now = new Date();
    const stayDurationMinutes =
      arrivalReport.arrivalTime && now
        ? Math.max(
            0,
            Math.round(
              (now.getTime() - arrivalReport.arrivalTime.getTime()) / 60000
            )
          )
        : null;

    const distanceMeters =
      arrivalReport.arrivalLocation && dto.departureLocation
        ? this.calculateDistanceMeters(
            arrivalReport.arrivalLocation.latitude,
            arrivalReport.arrivalLocation.longitude,
            dto.departureLocation.latitude,
            dto.departureLocation.longitude
          )
        : null;

    arrivalReport.departureTime = now;
    arrivalReport.departureLocation = dto.departureLocation || null;
    arrivalReport.departurePhotoUrls = dto.departurePhotoUrls || undefined;
    arrivalReport.departureNote = dto.departureNote || undefined;
    arrivalReport.stayDurationMinutes = stayDurationMinutes;
    arrivalReport.distanceMeters = distanceMeters;
    arrivalReport.status = ARRIVAL_REPORT_STATUS.DEPARTED as 'departed';

    const savedReport = await this.arrivalReportRepository.save(arrivalReport);

    // Gửi notification cho những người nhận thông báo (nếu có)
    const checkEmployeeIds = arrivalReport.checkEmployeeIds?.length
      ? arrivalReport.checkEmployeeIds.map(id => Number(id))
      : arrivalReport.checkEmployeeId
        ? [Number(arrivalReport.checkEmployeeId)]
        : [];

    if (checkEmployeeIds.length > 0) {
      try {
        const employee = await this.employeeRepository.findOne({
          where: { id: employeeId },
          relations: ['user'],
        });

        const checkEmployees = await this.employeeRepository.find({
          where: checkEmployeeIds.map(id => ({ id })),
          relations: ['user'],
        });

        const checkUserIds = checkEmployees
          .filter(ce => ce?.userId)
          .map(ce => ce.userId);

        if (checkUserIds.length > 0 && employee?.user?.fullName) {
          await this.notificationService.sendNotificationToMultipleUsers(
            checkUserIds,
            'Báo cáo rời nhà máy',
            `${employee.user.fullName} đã báo cáo rời ${arrivalReport.companyName || 'công ty'}`,
            NOTIFICATION_TYPE.ARRIVAL_REPORT_CREATED,
            savedReport.id,
            {
              employeeName: employee.user.fullName,
              companyName: arrivalReport.companyName || '',
              departureTime: now.toISOString(),
              departureLocation: dto.departureLocation,
              stayDurationMinutes: stayDurationMinutes,
            }
          );
        }
      } catch (error) {
        this.error('Error sending notification:', error);
        // Không throw error để không ảnh hưởng đến việc báo cáo rời
      }
    }

    return savedReport;
  }

  // Haversine distance (meters)
  private calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371000; // meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return Math.round(d * 100) / 100; // keep 2 decimals
  }

  // Xem lịch sử báo cáo của mình
  async findMyReports(
    employeeId: number,
    options: IPaginationOptions,
    startDate?: string,
    endDate?: string
  ): Promise<IPaginationResult<ArrivalReport>> {
    try {
      const where: any = { employeeId };

      if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.arrivalDate = Between(start, end);
      }

      return PaginationHelper.paginate(
        this.arrivalReportRepository,
        options,
        where,
        ['employee', 'employee.user', 'factory']
      );
    } catch (error) {
      this.error('Error finding my reports', {
        context: this.context,
        trace: error?.stack || error,
      });
      throw error;
    }
  }

  // Quản lý xem tất cả báo cáo của factory
  // Optimized: WHERE trước để filter sớm, sau đó mới JOIN
  async findByFactory(
    factoryId: number,
    options: IPaginationOptions,
    filters?: {
      startDate?: string;
      endDate?: string;
      employeeId?: number;
      departmentId?: number;
      status?: string;
      search?: string;
    }
  ): Promise<IPaginationResult<ArrivalReport>> {
    try {
      const queryBuilder = this.arrivalReportRepository
        .createQueryBuilder('arrivalReport')
        .where('arrivalReport.factoryId = :factoryId', { factoryId })
        .leftJoin('arrivalReport.employee', 'employee')
        .leftJoin('employee.user', 'employeeUser')
        .leftJoin('employee.position', 'position')
        .leftJoin('employee.department', 'department')
        .leftJoin('arrivalReport.factory', 'factory')
        .leftJoin('arrivalReport.checker', 'checker')
        .leftJoin('checker.user', 'checkerUser')
        .select([
          'arrivalReport.id',
          'arrivalReport.companyName',
          'arrivalReport.arrivalDate',
          'arrivalReport.arrivalTime',
          'arrivalReport.departureTime',
          'arrivalReport.arrivalLocation',
          'arrivalReport.departureLocation',
          'arrivalReport.photoUrls',
          'arrivalReport.departurePhotoUrls',
          'arrivalReport.stayDurationMinutes',
          'arrivalReport.distanceMeters',
          'arrivalReport.status',
          'arrivalReport.note',
          'arrivalReport.departureNote',
          'arrivalReport.checkEmployeeIds',
          'arrivalReport.createdAt',
          // Employee info
          'employee.id',
          'employeeUser.id',
          'employeeUser.fullName',
          // Position & Department
          'position.id',
          'position.name',
          'department.id',
          'department.name',
          // Factory
          'factory.id',
          'factory.name',
          // Checker info (legacy)
          'checker.id',
          'checkerUser.id',
          'checkerUser.fullName',
        ])
        .orderBy('arrivalReport.createdAt', 'DESC');

      // Filter theo ngày
      if (filters?.startDate && filters?.endDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        queryBuilder.andWhere(
          'arrivalReport.arrivalDate BETWEEN :start AND :end',
          {
            start,
            end,
          }
        );
      }

      // Filter theo nhân viên
      if (filters?.employeeId) {
        queryBuilder.andWhere('arrivalReport.employeeId = :employeeId', {
          employeeId: filters.employeeId,
        });
      }

      // Filter theo bộ phận
      if (filters?.departmentId) {
        queryBuilder.andWhere('employee.departmentId = :departmentId', {
          departmentId: filters.departmentId,
        });
      }

      // Filter theo trạng thái
      if (filters?.status) {
        queryBuilder.andWhere('arrivalReport.status = :status', {
          status: filters.status,
        });
      }

      // Filter theo search (tên nhân viên)
      if (filters?.search) {
        const searchTerm = `%${filters.search.toLowerCase()}%`;
        queryBuilder.andWhere('LOWER(employeeUser.fullName) LIKE :search', {
          search: searchTerm,
        });
      }

      const [data, total] = await queryBuilder
        .skip((options.page - 1) * options.limit)
        .take(options.limit)
        .getManyAndCount();

      return {
        data,
        meta: {
          page: options.page,
          limit: options.limit,
          total,
          totalPages: Math.ceil(total / options.limit),
          hasNextPage: options.page < Math.ceil(total / options.limit),
          hasPreviousPage: options.page > 1,
        },
      };
    } catch (error) {
      this.error('Error finding reports by factory', {
        context: this.context,
        trace: error?.stack || error,
      });
      throw error;
    }
  }

  // Xem chi tiết 1 báo cáo
  async findOne(id: number): Promise<ArrivalReport> {
    try {
      const report = await this.arrivalReportRepository.findOne({
        where: { id },
        relations: [
          'employee',
          'employee.user',
          'employee.position',
          'employee.department',
          'factory',
          'checker',
          'checker.user',
        ],
      });

      if (!report) {
        throw new NotFoundException('Không tìm thấy báo cáo');
      }

      // Nếu có checkEmployeeIds, load thêm thông tin các checkers
      if (report.checkEmployeeIds?.length) {
        const checkerIds = report.checkEmployeeIds.map(id => Number(id));
        const checkers = await this.employeeRepository
          .createQueryBuilder('employee')
          .leftJoin('employee.user', 'user')
          .select(['employee.id', 'user.id', 'user.fullName'])
          .whereInIds(checkerIds)
          .getMany();
        // Sắp xếp theo thứ tự trong checkEmployeeIds
        const checkerMap = new Map(checkers.map(c => [Number(c.id), c]));
        (report as any).checkers = checkerIds
          .map(id => checkerMap.get(id))
          .filter(Boolean);
      }

      return report;
    } catch (error) {
      this.error('Error finding one report', {
        context: this.context,
        trace: error?.stack || error,
      });
      throw error;
    }
  }
}
