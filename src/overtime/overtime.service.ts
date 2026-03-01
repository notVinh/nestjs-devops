import { Injectable, Inject } from '@nestjs/common';
import { throwBadRequestError, throwNotFoundError } from '../utils/error.helper';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Overtime } from './entities/overtime.entity';
import { OvertimeCoefficient } from 'src/overtime-coefficient/entities/overtime-coefficient.entity';
import { Attendance } from 'src/attendance/entities/attendance.entity';
import { Employee } from 'src/employee/entities/employee.entity';
import { CreateOvertimeDto } from './dto/create-overtime.dto';
import { UpdateOvertimeDto } from './dto/update-overtime.dto';
import {
  IPaginationOptions,
  IPaginationResult,
} from 'src/utils/types/pagination-options.type';
import { NotificationService } from 'src/notification/notification.service';
import { NOTIFICATION_TYPE } from 'src/notification/constants/notification-type.constant';
import { EMPLOYEE_PERMISSION } from 'src/employee/constants/employee-permission.constant';
import { hasEmployeePermission } from 'src/utils/employee-permissions.helper';

@Injectable()
export class OvertimeService {
  private readonly context = 'OvertimeService';

  constructor(
    @InjectRepository(Overtime)
    private readonly overtimeRepository: Repository<Overtime>,
    @InjectRepository(OvertimeCoefficient)
    private readonly coefficientRepository: Repository<OvertimeCoefficient>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly notificationService: NotificationService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
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
      this.logger.error(message, { context: this.context, trace: trace?.stack || trace });
    } else {
      this.logger.error(message, { context: this.context });
    }
  }

  async create(dto: CreateOvertimeDto) {
    // Lấy hệ số từ overtimeCoefficientId
    const coefficient = await this.coefficientRepository.findOne({
      where: { id: dto.overtimeCoefficientId },
    });

    if (!coefficient) {
      throwBadRequestError('Hệ số làm thêm không tồn tại');
    }

    if (!coefficient.isActive) {
      throwBadRequestError('Hệ số làm thêm đã bị tắt');
    }

    // Xử lý timeSlots: ưu tiên timeSlots, nếu không có thì dùng startTime/endTime (backward compatible)
    let timeSlots: Array<{ startTime: string; endTime: string }>;
    let startTime: string;
    let endTime: string;

    if (dto.timeSlots && dto.timeSlots.length > 0) {
      // Sử dụng timeSlots mới
      timeSlots = dto.timeSlots;
      // Validate: không được trùng lặp hoặc overlap
      this.validateTimeSlots(timeSlots);
      // Lấy startTime/endTime từ slot đầu tiên để backward compatible
      startTime = timeSlots[0].startTime;
      endTime = timeSlots[timeSlots.length - 1].endTime;
    } else if (dto.startTime && dto.endTime) {
      // Legacy: dùng startTime/endTime
      startTime = dto.startTime;
      endTime = dto.endTime;
      timeSlots = [{ startTime: dto.startTime, endTime: dto.endTime }];
    } else {
      throwBadRequestError('Phải cung cấp timeSlots hoặc startTime/endTime');
    }

    // Tính tổng số giờ từ tất cả các khung giờ
    const totalHours = this.calculateTotalHoursFromTimeSlots(timeSlots);

    // Chuyển coefficient từ % sang decimal (150 -> 1.5)
    const overtimeRate = coefficient.coefficient / 100;

    // Xử lý approverEmployeeIds (ưu tiên) hoặc approverEmployeeId (legacy)
    const approverEmployeeIds = dto.approverEmployeeIds?.length
      ? dto.approverEmployeeIds
      : dto.approverEmployeeId
        ? [dto.approverEmployeeId]
        : [];

    if (approverEmployeeIds.length === 0) {
      throwBadRequestError('Phải có ít nhất một người duyệt');
    }

    // Kiểm tra logic tạo đơn: chỉ kiểm tra nếu KHÔNG có parentOvertimeId (đơn mới)
    if (!dto.parentOvertimeId) {
      const overtimeDate = new Date(dto.overtimeDate);
      overtimeDate.setHours(0, 0, 0, 0);

      // Tìm đơn tăng ca cùng ngày
      const existingOvertimes = await this.overtimeRepository.find({
        where: {
          employeeId: dto.employeeId,
          factoryId: dto.factoryId,
          overtimeDate: overtimeDate,
        },
        order: { createdAt: 'DESC' },
      });

      // Kiểm tra đơn đã được duyệt
      const approvedOvertime = existingOvertimes.find(ot => ot.status === 'approved');
      
      // Kiểm tra đơn đang pending
      const pendingOvertime = existingOvertimes.find(ot => ot.status === 'pending');

      if (approvedOvertime) {
        // Đã có đơn được duyệt → tạo đơn bổ sung
        dto.parentOvertimeId = approvedOvertime.id;
        this.log(`Tạo đơn bổ sung cho đơn gốc #${approvedOvertime.id}`);
      } else if (pendingOvertime) {
        // Có đơn đang pending → nhắc nhở sửa đơn cũ
        throwBadRequestError(
          `Bạn đã có đơn tăng ca đang chờ duyệt cho ngày này (ID: ${pendingOvertime.id}). ` +
          `Vui lòng sửa đơn cũ thay vì tạo đơn mới.`
        );
      }
      // Nếu không có đơn nào → tạo đơn gốc mới (bình thường)
    } else {
      // Nếu có parentOvertimeId, validate đơn gốc
      const parentOvertime = await this.overtimeRepository.findOne({
        where: { id: dto.parentOvertimeId },
      });

      if (!parentOvertime) {
        throwBadRequestError('Đơn tăng ca gốc không tồn tại');
      }

      if (parentOvertime.status !== 'approved') {
        throwBadRequestError('Chỉ có thể tạo đơn bổ sung cho đơn đã được duyệt');
      }

      if (parentOvertime.employeeId !== dto.employeeId) {
        throwBadRequestError('Đơn bổ sung phải cùng nhân viên với đơn gốc');
      }

      if (parentOvertime.factoryId !== dto.factoryId) {
        throwBadRequestError('Đơn bổ sung phải cùng nhà máy với đơn gốc');
      }

      // Đảm bảo cùng ngày
      const parentDate = new Date(parentOvertime.overtimeDate).toISOString().split('T')[0];
      const newDate = dto.overtimeDate.split('T')[0];
      if (parentDate !== newDate) {
        throwBadRequestError('Đơn bổ sung phải cùng ngày với đơn gốc');
      }
    }

    const entity: Partial<Overtime> = {
      factoryId: dto.factoryId,
      employeeId: dto.employeeId,
      approverEmployeeId: approverEmployeeIds[0], // Legacy: lưu người đầu tiên
      approverEmployeeIds, // Danh sách tất cả người được giao duyệt
      coefficientName: coefficient.shiftName, // Lưu snapshot tên ca làm
      overtimeDate: new Date(dto.overtimeDate),
      startTime, // Legacy field, sync từ timeSlots[0]
      endTime, // Legacy field, sync từ timeSlots cuối
      timeSlots, // Lưu nhiều khung giờ
      totalHours,
      overtimeRate,
      reason: dto.reason ?? null,
      requestLocation: dto.requestLocation ?? null,
      parentOvertimeId: dto.parentOvertimeId ?? null, // ID đơn gốc nếu là đơn bổ sung
      status: 'pending', // Đơn bổ sung luôn bắt đầu với status pending
    };

    const overtime = await this.overtimeRepository.save(
      this.overtimeRepository.create(entity)
    );

    // Gửi notification cho tất cả người được giao duyệt
    try {
      const employee = await this.employeeRepository.findOne({
        where: { id: dto.employeeId },
        relations: ['user'],
      });

      if (employee?.user?.fullName) {
        const approvers = await this.employeeRepository.find({
          where: approverEmployeeIds.map(id => ({ id })),
          relations: ['user'],
        });

        const approverUserIds = approvers
          .filter(a => a?.userId)
          .map(a => a.userId);

        if (approverUserIds.length > 0) {
          const overtimeDate = new Date(dto.overtimeDate);

          // Tạo message với thông tin các khung giờ
          const timeSlotsText = timeSlots.length > 1
            ? timeSlots.map(slot => `${slot.startTime}-${slot.endTime}`).join(', ')
            : `${startTime}-${endTime}`;

          await this.notificationService.sendNotificationToMultipleUsers(
            approverUserIds,
            'Đơn tăng ca mới',
            `${employee.user.fullName} đã tạo đơn tăng ca ngày ${overtimeDate.toLocaleDateString('vi-VN')} (${timeSlotsText})`,
            NOTIFICATION_TYPE.OVERTIME_CREATED,
            overtime.id,
            {
              employeeName: employee.user.fullName,
              overtimeDate: overtimeDate.toISOString(),
              startTime,
              endTime,
              timeSlots,
              totalHours,
              coefficientName: coefficient.shiftName,
            }
          );
        }
      }
    } catch (error) {
      this.error('Error sending notification:', error);
      // Không throw error để không ảnh hưởng đến việc tạo overtime
    }

    // Load lại đầy đủ relations để trả về cho client
    return this.findOne(overtime.id);
  }

  async findOne(id: number) {
    const found = await this.overtimeRepository.findOne({
      where: { id },
      relations: ['employee', 'employee.user', 'approver', 'approver.user', 'decidedBy', 'decidedBy.user'],
    });
    if (!found) {
      throwNotFoundError('Đơn tăng ca không tồn tại');
    }

    // Nếu có approverEmployeeIds, load thêm thông tin các approvers - chỉ lấy id và fullName
    if (found.approverEmployeeIds?.length) {
      const approverIds = found.approverEmployeeIds.map(id => Number(id));
      const approvers = await this.employeeRepository
        .createQueryBuilder('employee')
        .leftJoin('employee.user', 'user')
        .select(['employee.id', 'user.id', 'user.fullName'])
        .whereInIds(approverIds)
        .getMany();
      // Sắp xếp theo thứ tự trong approverEmployeeIds
      const approverMap = new Map(approvers.map(a => [Number(a.id), a]));
      (found as any).approvers = approverIds
        .map(id => approverMap.get(id))
        .filter(Boolean);
    }

    return found;
  }

  // Optimized: WHERE trước để filter sớm, sau đó mới JOIN
  async findAllByFactory(
    options: IPaginationOptions,
    factoryId: number,
    filters?: {
      status?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    },
  ): Promise<IPaginationResult<Overtime>> {
    const queryBuilder = this.overtimeRepository
      .createQueryBuilder('overtime')
      .where('overtime.factoryId = :factoryId', { factoryId })
      .leftJoin('overtime.employee', 'employee')
      .leftJoin('employee.user', 'employeeUser')
      .leftJoin('overtime.approver', 'approver')
      .leftJoin('approver.user', 'approverUser')
      .leftJoin('overtime.decidedBy', 'decidedBy')
      .leftJoin('decidedBy.user', 'decidedByUser')
      .select([
        'overtime.id',
        'overtime.overtimeDate',
        'overtime.startTime',
        'overtime.endTime',
        'overtime.totalHours',
        'overtime.overtimeRate',
        'overtime.coefficientName',
        'overtime.status',
        'overtime.reason',
        'overtime.decidedAt',
        'overtime.createdAt',
        'overtime.actualStatus',
        'overtime.excessHours',
        'overtime.approverEmployeeIds',
        'overtime.decidedByEmployeeId',
        'overtime.timeSlots',
        // Employee info
        'employee.id',
        'employeeUser.id',
        'employeeUser.fullName',
        // Approver info (legacy)
        'approver.id',
        'approverUser.id',
        'approverUser.fullName',
        // DecidedBy info
        'decidedBy.id',
        'decidedByUser.id',
        'decidedByUser.fullName',
      ])
      .orderBy('overtime.createdAt', 'DESC');

    if (filters?.status) {
      queryBuilder.andWhere('overtime.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.startDate && filters?.endDate) {
      queryBuilder.andWhere('overtime.overtimeDate >= :startDate', {
        startDate: filters.startDate,
      });
      queryBuilder.andWhere('overtime.overtimeDate <= :endDate', {
        endDate: filters.endDate,
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

    // Load approvers từ approverEmployeeIds
    await this.loadApproversForList(data);

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
  }

  // Helper: Load approvers cho danh sách overtime
  private async loadApproversForList(overtimes: Overtime[]): Promise<void> {
    // Thu thập tất cả approverEmployeeIds unique
    const allApproverIds = new Set<number>();
    for (const ot of overtimes) {
      if (ot.approverEmployeeIds?.length) {
        ot.approverEmployeeIds.forEach(id => allApproverIds.add(Number(id)));
      }
    }

    if (allApproverIds.size === 0) return;

    // Query tất cả approvers 1 lần - chỉ lấy id và fullName
    const approvers = await this.employeeRepository
      .createQueryBuilder('employee')
      .leftJoin('employee.user', 'user')
      .select(['employee.id', 'user.id', 'user.fullName'])
      .whereInIds(Array.from(allApproverIds))
      .getMany();

    // Map approvers theo id (convert to number để đảm bảo so sánh đúng)
    const approverMap = new Map(approvers.map(a => [Number(a.id), a]));

    // Gán approvers cho từng overtime
    for (const ot of overtimes) {
      if (ot.approverEmployeeIds?.length) {
        (ot as any).approvers = ot.approverEmployeeIds
          .map(id => approverMap.get(Number(id)))
          .filter(Boolean);
      }
    }
  }

  // Lấy danh sách đơn tăng ca được giao cho mình duyệt
  async findAssignedToMe(
    options: IPaginationOptions,
    employeeId: number,
    filters?: {
      status?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<IPaginationResult<Overtime>> {
    // Tìm đơn được giao cho mình duyệt (trong approverEmployeeIds hoặc approverEmployeeId legacy)
    const queryBuilder = this.overtimeRepository
      .createQueryBuilder('overtime')
      .where('(:employeeId = ANY("overtime"."approverEmployeeIds") OR "overtime"."approverEmployeeId" = :employeeId)', { employeeId })
      .leftJoin('overtime.employee', 'employee')
      .leftJoin('employee.user', 'employeeUser')
      .leftJoin('overtime.approver', 'approver')
      .leftJoin('approver.user', 'approverUser')
      .leftJoin('overtime.decidedBy', 'decidedBy')
      .leftJoin('decidedBy.user', 'decidedByUser')
      .select([
        'overtime.id',
        'overtime.overtimeDate',
        'overtime.startTime',
        'overtime.endTime',
        'overtime.totalHours',
        'overtime.overtimeRate',
        'overtime.coefficientName',
        'overtime.status',
        'overtime.reason',
        'overtime.decidedAt',
        'overtime.createdAt',
        'overtime.actualStatus',
        'overtime.excessHours',
        'overtime.approverEmployeeIds',
        'overtime.decidedByEmployeeId',
        'overtime.timeSlots',
        // Employee info (người đăng ký tăng ca)
        'employee.id',
        'employeeUser.id',
        'employeeUser.fullName',
        // Approver info (legacy)
        'approver.id',
        'approverUser.id',
        'approverUser.fullName',
        // DecidedBy info
        'decidedBy.id',
        'decidedByUser.id',
        'decidedByUser.fullName',
      ])
      .orderBy('overtime.createdAt', 'DESC');

    // Thêm bộ lọc theo status
    if (filters?.status) {
      queryBuilder.andWhere('overtime.status = :status', {
        status: filters.status,
      });
    }

    // Thêm bộ lọc theo khoảng thời gian
    if (filters?.startDate && filters?.endDate) {
      queryBuilder.andWhere('overtime.overtimeDate >= :startDate', {
        startDate: filters.startDate,
      });
      queryBuilder.andWhere('overtime.overtimeDate <= :endDate', {
        endDate: filters.endDate,
      });
    }

    const [data, total] = await queryBuilder
      .skip((options.page - 1) * options.limit)
      .take(options.limit)
      .getManyAndCount();

    // Load approvers từ approverEmployeeIds
    await this.loadApproversForList(data);

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
  }

  // Optimized: WHERE trước để filter sớm, sau đó mới JOIN + Thêm pagination
  async findAllByEmployee(
    options: IPaginationOptions,
    employeeId: number,
    filters?: {
      status?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<IPaginationResult<Overtime>> {
    const queryBuilder = this.overtimeRepository
      .createQueryBuilder('overtime')
      .where('overtime.employeeId = :employeeId', { employeeId })
      .leftJoin('overtime.employee', 'employee')
      .leftJoin('employee.user', 'employeeUser')
      .leftJoin('overtime.approver', 'approver')
      .leftJoin('approver.user', 'approverUser')
      .leftJoin('overtime.decidedBy', 'decidedBy')
      .leftJoin('decidedBy.user', 'decidedByUser')
      .select([
        'overtime.id',
        'overtime.overtimeDate',
        'overtime.startTime',
        'overtime.endTime',
        'overtime.totalHours',
        'overtime.overtimeRate',
        'overtime.coefficientName',
        'overtime.status',
        'overtime.reason',
        'overtime.decidedAt',
        'overtime.createdAt',
        'overtime.actualStatus',
        'overtime.excessHours',
        'overtime.approverEmployeeIds',
        'overtime.decidedByEmployeeId',
        'overtime.timeSlots',
        // Employee info
        'employee.id',
        'employeeUser.id',
        'employeeUser.fullName',
        // Approver info (legacy)
        'approver.id',
        'approverUser.id',
        'approverUser.fullName',
        // DecidedBy info
        'decidedBy.id',
        'decidedByUser.id',
        'decidedByUser.fullName',
      ])
      .orderBy('overtime.createdAt', 'DESC');

    // Thêm bộ lọc theo status
    if (filters?.status) {
      queryBuilder.andWhere('overtime.status = :status', {
        status: filters.status,
      });
    }

    // Thêm bộ lọc theo khoảng thời gian
    if (filters?.startDate && filters?.endDate) {
      queryBuilder.andWhere('overtime.overtimeDate >= :startDate', {
        startDate: filters.startDate,
      });
      queryBuilder.andWhere('overtime.overtimeDate <= :endDate', {
        endDate: filters.endDate,
      });
    }

    const [data, total] = await queryBuilder
      .skip((options.page - 1) * options.limit)
      .take(options.limit)
      .getManyAndCount();

    // Load approvers từ approverEmployeeIds
    await this.loadApproversForList(data);

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
  }

  async update(id: number, dto: UpdateOvertimeDto) {
    const found = await this.findOne(id);

    const coefficient = await this.coefficientRepository.findOne({
      where: { id: dto.overtimeCoefficientId },
    });
    if (!coefficient) {
      throwBadRequestError('Hệ số làm thêm không tồn tại');
    }
    if (!coefficient.isActive) {
      throwBadRequestError('Hệ số làm thêm đã bị tắt');
    }

    found.overtimeRate = coefficient.coefficient / 100;
    found.coefficientName = coefficient.shiftName;

    // Xử lý timeSlots nếu có
    let totalHours = found.totalHours;
    let newStartTime = dto.startTime ?? found.startTime;
    let newEndTime = dto.endTime ?? found.endTime;
    let timeSlots = dto.timeSlots ?? found.timeSlots;

    // Nếu có timeSlots, tính lại totalHours và cập nhật startTime/endTime
    if (dto.timeSlots && dto.timeSlots.length > 0) {
      totalHours = this.calculateTotalHoursFromTimeSlots(dto.timeSlots);
      // Cập nhật startTime/endTime từ slot đầu/cuối để backward compatible
      newStartTime = dto.timeSlots[0].startTime;
      newEndTime = dto.timeSlots[dto.timeSlots.length - 1].endTime;
      timeSlots = dto.timeSlots;
    } else if (dto.startTime || dto.endTime) {
      // Nếu chỉ update startTime/endTime (không có timeSlots), tính lại totalHours
      totalHours = this.calculateTotalHours(newStartTime, newEndTime);
      // Nếu có timeSlots cũ, cập nhật slot đầu/cuối
      if (found.timeSlots && found.timeSlots.length > 0) {
        const updatedTimeSlots = [...found.timeSlots];
        updatedTimeSlots[0].startTime = newStartTime;
        updatedTimeSlots[updatedTimeSlots.length - 1].endTime = newEndTime;
        timeSlots = updatedTimeSlots;
      } else {
        // Nếu không có timeSlots cũ, tạo mới từ startTime/endTime
        timeSlots = [{ startTime: newStartTime, endTime: newEndTime }];
      }
    }

    const next: Partial<Overtime> = {
      ...found,
      ...dto,
      startTime: newStartTime,
      endTime: newEndTime,
      timeSlots,
      totalHours,
    } as any;

    // Nếu duyệt/từ chối/hủy, cập nhật decidedAt và decidedByEmployeeId
    if (
      dto.status &&
      ['approved', 'rejected', 'cancelled'].includes(dto.status)
    ) {
      next.decidedAt = new Date();

      // Lưu người thực sự duyệt/từ chối đơn
      if (dto.decidedByEmployeeId) {
        next.decidedByEmployeeId = dto.decidedByEmployeeId;
      }
    }

    // Xử lý lưu overtime hours vào attendance khi duyệt
    if (dto.status && dto.status !== found.status) {
      await this.handleOvertimeStatusChange(
        found,
        dto.status,
        Number(totalHours),
      );

      // Merge changes từ found vào next (excessHours và actualStatus được set trong handleOvertimeStatusChange)
      if (found.excessHours !== undefined) {
        next.excessHours = found.excessHours;
      }
      if (found.actualStatus !== undefined) {
        next.actualStatus = found.actualStatus;
      }
    }

    const updatedOvertime = await this.overtimeRepository.save(
      this.overtimeRepository.create(next)
    );

    // Gửi notification cho nhân viên khi đơn được duyệt/từ chối
    if (
      dto.status &&
      ['approved', 'rejected'].includes(dto.status) &&
      found.status === 'pending'
    ) {
      try {
        const employee = await this.employeeRepository.findOne({
          where: { id: found.employeeId },
          relations: ['user'],
        });

        if (!employee) {
          this.warn(`Employee not found: ${found.employeeId}`);
          return updatedOvertime;
        }

        if (!employee.userId) {
          this.warn(`Employee has no userId: ${found.employeeId}`);
          return updatedOvertime;
        }

        const statusText =
          dto.status === 'approved' ? 'đã được duyệt' : 'đã bị từ chối';
        const notificationType =
          dto.status === 'approved'
            ? NOTIFICATION_TYPE.OVERTIME_APPROVED
            : NOTIFICATION_TYPE.OVERTIME_REJECTED;

        const overtimeDate = new Date(found.overtimeDate);

        await this.notificationService.sendNotificationToUser(
          employee.userId,
          `Đơn tăng ca ${statusText}`,
          `Đơn tăng ca của bạn ngày ${overtimeDate.toLocaleDateString('vi-VN')} (${found.startTime} - ${found.endTime}) ${statusText}`,
          notificationType,
          found.id,
          {
            status: dto.status,
            overtimeDate: overtimeDate.toISOString(),
            startTime: found.startTime,
            endTime: found.endTime,
            totalHours: found.totalHours,
            coefficientName: found.coefficientName,
          }
        );

        // Gửi notification cho HR khi đơn được duyệt
        if (dto.status === 'approved') {
          await this.sendNotificationToHR(
            found.factoryId,
            employee.user?.fullName || `NV #${found.employeeId}`,
            overtimeDate,
            found.startTime,
            found.endTime,
            Number(found.totalHours),
            found.id
          );
        }
      } catch (error) {
        this.error('Error sending notification:', error);
        // Không throw error để không ảnh hưởng đến việc update overtime
      }
    }

    // Load lại đầy đủ relations để trả về cho client
    return this.findOne(updatedOvertime.id);
  }

  /**
   * Tạo đơn tăng ca bổ sung cho đơn đã được duyệt
   * Đơn bổ sung sẽ có status 'pending' và cần được duyệt riêng
   */
  async createSupplement(
    parentOvertimeId: number,
    dto: CreateOvertimeDto,
  ): Promise<Overtime> {
    // Validate đơn gốc
    const parentOvertime = await this.findOne(parentOvertimeId);

    if (parentOvertime.status !== 'approved') {
      throwBadRequestError('Chỉ có thể tạo đơn bổ sung cho đơn đã được duyệt');
    }

    // Đảm bảo cùng nhân viên, nhà máy, và ngày
    if (parentOvertime.employeeId !== dto.employeeId) {
      throwBadRequestError('Đơn bổ sung phải cùng nhân viên với đơn gốc');
    }

    if (parentOvertime.factoryId !== dto.factoryId) {
      throwBadRequestError('Đơn bổ sung phải cùng nhà máy với đơn gốc');
    }

    const parentDate = new Date(parentOvertime.overtimeDate).toISOString().split('T')[0];
    const newDate = dto.overtimeDate.split('T')[0];
    if (parentDate !== newDate) {
      throwBadRequestError('Đơn bổ sung phải cùng ngày với đơn gốc');
    }

    // Tạo đơn bổ sung với parentOvertimeId
    const supplementDto: CreateOvertimeDto = {
      ...dto,
      parentOvertimeId: parentOvertimeId,
    };

    return this.create(supplementDto);
  }

  /**
   * Xử lý thay đổi trạng thái overtime và cập nhật attendance
   * Sử dụng stored procedure để tối ưu performance
   */
  private async handleOvertimeStatusChange(
    overtime: Overtime,
    newStatus: string,
    totalHours: number,
  ) {
    const oldStatus = overtime.status;

    // Trường hợp 1: Duyệt đơn (pending -> approved)
    if (oldStatus === 'pending' && newStatus === 'approved') {
      // Kiểm tra xem đây có phải đơn bổ sung không
      const isSupplement = overtime.parentOvertimeId !== null && overtime.parentOvertimeId !== undefined;

      if (isSupplement) {
        // Đơn bổ sung: gọi procedure xử lý đơn bổ sung
        // Procedure này sẽ tính lại giờ thực tế cho TẤT CẢ đơn (gốc + bổ sung) cùng ngày
        const result = await this.overtimeRepository.query(
          `SELECT * FROM handle_overtime_supplement_approval($1, $2, $3, $4, $5)`,
          [
            overtime.id,
            overtime.employeeId,
            overtime.factoryId,
            overtime.overtimeDate,
            totalHours,
          ],
        );

        // Cập nhật record overtime với kết quả từ stored procedure
        if (result && result.length > 0) {
          overtime.excessHours = result[0].excess_hours;
          overtime.actualStatus = result[0].actual_status;
        }
      } else {
        // Đơn gốc: gọi procedure xử lý đơn thông thường
        // Function mới: handle_overtime_approval_v2 - tự đọc timeSlots từ overtime table
        // Function cũ: handle_overtime_approval - vẫn giữ để backward compatible
        const result = await this.overtimeRepository.query(
          `SELECT * FROM handle_overtime_approval_v2($1, $2, $3, $4, $5)`,
          [
            overtime.id,
            overtime.employeeId,
            overtime.factoryId,
            overtime.overtimeDate,
            totalHours,
          ],
        );

        // Cập nhật record overtime với kết quả từ stored procedure
        if (result && result.length > 0) {
          overtime.excessHours = result[0].excess_hours;
          overtime.actualStatus = result[0].actual_status;
        }
      }
    }

    // Trường hợp 2: Hủy đơn đã duyệt (approved -> rejected/cancelled)
    if (oldStatus === 'approved' && ['rejected', 'cancelled'].includes(newStatus)) {
      // Gọi stored procedure để trừ số giờ tăng ca
      await this.overtimeRepository.query(
        `SELECT subtract_overtime_hours($1, $2, $3)`,
        [overtime.employeeId, overtime.overtimeDate, Number(overtime.totalHours)],
      );
    }
  }

  /**
   * @deprecated Không còn sử dụng - logic đã được move vào stored procedure handle_overtime_approval()
   * Tính toán và cập nhật số giờ tăng ca dựa trên thời gian thực tế
   * Sử dụng khi duyệt đơn SAU khi nhân viên đã checkout
   */
  private async calculateAndUpdateOvertimeHours(
    overtime: Overtime,
    attendance: Attendance,
    checkOutTime: Date,
    totalHours: number,
  ) {
    // Tạo planned start time từ overtimeDate + startTime đăng ký
    const [startHour, startMinute] = overtime.startTime.split(':').map(Number);
    const plannedStartTime = new Date(overtime.overtimeDate);
    plannedStartTime.setHours(startHour, startMinute, 0, 0);

    // Actual end time là checkOutTime từ attendance
    const actualEndTime = checkOutTime;

    // Tính số giờ thực tế làm tăng ca (từ planned start đến actual checkout)
    const diffMs = actualEndTime.getTime() - plannedStartTime.getTime();

    // Nếu checkOutTime trước plannedStartTime, không tính là tăng ca
    if (diffMs <= 0) {
      overtime.excessHours = Number(totalHours) * -1;
      overtime.actualStatus = 'completed_early';

      // Không có overtime hours thực tế
      attendance.overtimeHours = 0;
      attendance.overtimeNote = `Nhân viên checkout trước giờ bắt đầu tăng ca. Đăng ký: ${overtime.startTime}-${overtime.endTime}, Checkout: ${actualEndTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}.`;
      await this.attendanceRepository.save(attendance);
      return;
    }

    const actualHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
    const plannedHours = Number(totalHours);
    const excessHours = Number((actualHours - plannedHours).toFixed(2));

    // Xác định status và số giờ được thanh toán
    let actualStatus: 'completed' | 'completed_early' | 'exceeded';
    let payableHours: number;
    let overtimeNote: string;

    if (actualHours < plannedHours) {
      // Tình huống 1: Về sớm hơn đăng ký
      actualStatus = 'completed_early';
      payableHours = actualHours; // Trả theo giờ thực tế
      const shortHours = Math.abs(excessHours);
      overtimeNote = `Nhân viên về sớm hơn ${shortHours.toFixed(2)} giờ so với đăng ký. Đăng ký: ${plannedHours}h, Thực tế: ${actualHours}h.`;
    } else if (actualHours > plannedHours) {
      // Tình huống 2: Về muộn hơn đăng ký
      actualStatus = 'exceeded';
      payableHours = plannedHours; // CHỈ trả theo giờ đã duyệt
      overtimeNote = `Nhân viên làm thêm ${excessHours.toFixed(2)} giờ chưa được duyệt. Đăng ký: ${plannedHours}h, Thực tế: ${actualHours}h`;
    } else {
      // Đúng giờ
      actualStatus = 'completed';
      payableHours = actualHours;
      overtimeNote = `Nhân viên hoàn thành đúng giờ tăng ca đã đăng ký (${plannedHours}h).`;
    }

    // Cập nhật overtime record (chỉ tracking fields)
    overtime.excessHours = excessHours;
    overtime.actualStatus = actualStatus;

    // Cập nhật attendance với số giờ được thanh toán
    attendance.overtimeHours = payableHours;
    attendance.overtimeNote = overtimeNote;

    await this.attendanceRepository.save(attendance);
  }

  /**
   * @deprecated Không còn sử dụng - logic đã được move vào stored procedure handle_overtime_approval()
   * Cộng số giờ tăng ca vào record attendance
   */
  private async addOvertimeHoursToAttendance(
    employeeId: number,
    factoryId: number,
    overtimeDate: Date,
    totalHours: number,
  ) {
    // Tìm attendance record cho ngày này
    const attendanceDate = new Date(overtimeDate);
    attendanceDate.setHours(0, 0, 0, 0);

    let attendance = await this.attendanceRepository.findOne({
      where: {
        employeeId,
        attendanceDate,
      },
    });

    if (!attendance) {
      // Nếu chưa có attendance, tạo mới với status overtime_approved
      // Nhân viên chưa chấm công thực tế, chỉ được duyệt đơn tăng ca
      attendance = this.attendanceRepository.create({
        employeeId,
        factoryId,
        attendanceDate,
        overtimeHours: totalHours,
        status: 'overtime_approved', // Status đặc biệt: đã duyệt OT nhưng chưa chấm công
      });
    } else {
      // Nếu đã có attendance (đã chấm công), cộng thêm overtime hours
      const currentOT = Number(attendance.overtimeHours || 0);
      attendance.overtimeHours = currentOT + totalHours;

      // Nếu status đang là overtime_approved và bây giờ có thêm OT, giữ nguyên status
      // Nếu đã có status khác (present, late, etc.), giữ nguyên status đó
    }

    await this.attendanceRepository.save(attendance);
  }

  /**
   * @deprecated Không còn sử dụng - logic đã được move vào stored procedure subtract_overtime_hours()
   * Trừ số giờ tăng ca từ attendance (khi hủy đơn đã duyệt)
   */
  private async subtractOvertimeHoursFromAttendance(
    employeeId: number,
    factoryId: number,
    overtimeDate: Date,
    totalHours: number,
  ) {
    const attendanceDate = new Date(overtimeDate);
    attendanceDate.setHours(0, 0, 0, 0);

    const attendance = await this.attendanceRepository.findOne({
      where: {
        employeeId,
        attendanceDate,
      },
    });

    if (attendance) {
      const currentOT = Number(attendance.overtimeHours || 0);
      attendance.overtimeHours = Math.max(0, currentOT - totalHours);
      await this.attendanceRepository.save(attendance);
    }
  }

  async softDelete(id: number) {
    await this.findOne(id);
    return this.overtimeRepository.softDelete(id);
  }

  /**
   * Validate timeSlots: không được trùng lặp hoặc overlap
   * Giới hạn: tối đa 15 khung giờ trong 1 ngày
   */
  private validateTimeSlots(timeSlots: Array<{ startTime: string; endTime: string }>): void {
    if (timeSlots.length === 0) {
      throwBadRequestError('Phải có ít nhất một khung giờ tăng ca');
    }

    if (timeSlots.length > 15) {
      throwBadRequestError('Tối đa 15 khung giờ tăng ca trong một ngày');
    }

    // Validate từng slot
    for (const slot of timeSlots) {
      const slotHours = this.calculateTotalHours(slot.startTime, slot.endTime);
      if (slotHours <= 0) {
        throwBadRequestError(`Khung giờ ${slot.startTime}-${slot.endTime} không hợp lệ`);
      }
    }

    // Kiểm tra overlap (đơn giản: sắp xếp và kiểm tra)
    const sortedSlots = [...timeSlots].sort((a, b) => {
      const aStart = this.timeToMinutes(a.startTime);
      const bStart = this.timeToMinutes(b.startTime);
      return aStart - bStart;
    });

    for (let i = 0; i < sortedSlots.length - 1; i++) {
      const currentEnd = this.timeToMinutes(sortedSlots[i].endTime);
      const nextStart = this.timeToMinutes(sortedSlots[i + 1].startTime);
      
      // Nếu endTime của slot hiện tại > startTime của slot tiếp theo → overlap
      if (currentEnd > nextStart) {
        throwBadRequestError(
          `Khung giờ ${sortedSlots[i].startTime}-${sortedSlots[i].endTime} và ${sortedSlots[i + 1].startTime}-${sortedSlots[i + 1].endTime} bị trùng lặp`
        );
      }
    }
  }

  /**
   * Chuyển đổi time string (HH:mm) thành số phút
   */
  private timeToMinutes(time: string): number {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
  }

  /**
   * Tính tổng số giờ từ nhiều khung giờ
   */
  private calculateTotalHoursFromTimeSlots(timeSlots: Array<{ startTime: string; endTime: string }>): number {
    let total = 0;
    for (const slot of timeSlots) {
      total += this.calculateTotalHours(slot.startTime, slot.endTime);
    }
    return Number(total.toFixed(2));
  }

  /**
   * Tính tổng số giờ từ startTime đến endTime
   * Format: "HH:mm"
   * Hỗ trợ ca qua đêm: nếu endTime < startTime, tự động cộng 24h
   */
  private calculateTotalHours(startTime: string, endTime: string): number {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMinute;
    let endMinutes = endHour * 60 + endMinute;

    // Nếu endTime < startTime, nghĩa là ca qua đêm (ví dụ 22:00 -> 06:00)
    // Cộng thêm 24h (1440 phút) vào endMinutes
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60; // 1440 phút = 24 giờ
    }

    const diffMinutes = endMinutes - startMinutes;
    return Number((diffMinutes / 60).toFixed(2));
  }

  /**
   * Tính toán và cập nhật giờ tăng ca thực tế khi nhân viên checkout
   * Hỗ trợ nhiều khung giờ tăng ca trong cùng 1 ngày
   * Áp dụng logic:
   * - Tính giờ thực tế làm việc trong từng khung giờ đã đăng ký
   * - Nếu checkout sớm hơn đăng ký: tính theo giờ thực tế
   * - Nếu checkout muộn hơn đăng ký: chỉ tính giờ đã được duyệt
   *
   * Lưu ý: Actual time được lưu ở Attendance (checkInTime, checkOutTime)
   * Overtime chỉ lưu actualStatus và excessHours để tracking
   */
  async updateActualOvertimeHours(
    employeeId: number,
    factoryId: number,
    overtimeDate: Date,
    checkOutTime: Date,
  ): Promise<Overtime | null> {
    // Tìm đơn tăng ca đã approved cho ngày này
    const attendanceDate = new Date(overtimeDate);
    attendanceDate.setHours(0, 0, 0, 0);

    const overtime = await this.overtimeRepository.findOne({
      where: {
        employeeId,
        factoryId,
        overtimeDate: attendanceDate,
        status: 'approved',
      },
    });

    if (!overtime) {
      // Không có đơn tăng ca được duyệt
      return null;
    }

    // Lấy attendance record để có checkInTime
    const attendanceRecord = await this.attendanceRepository.findOne({
      where: {
        employeeId,
        attendanceDate,
      },
    });

    if (!attendanceRecord) {
      return null;
    }

    // Lấy checkInTime (nếu có) để tính từ thời điểm chấm công vào
    const checkInTime = attendanceRecord.checkInTime || checkOutTime;
    const checkInTimeMs = checkInTime.getTime();
    const checkOutTimeMs = checkOutTime.getTime();

    // Lấy timeSlots (nếu có) hoặc dùng startTime/endTime (backward compatible)
    const timeSlots = overtime.timeSlots && overtime.timeSlots.length > 0
      ? overtime.timeSlots
      : [{ startTime: overtime.startTime, endTime: overtime.endTime }];

    // Tính giờ thực tế làm việc trong từng khung giờ
    let totalActualHours = 0;

    for (const slot of timeSlots) {
      const [startHour, startMinute] = slot.startTime.split(':').map(Number);
      const [endHour, endMinute] = slot.endTime.split(':').map(Number);

      const slotStartDate = new Date(overtimeDate);
      slotStartDate.setHours(startHour, startMinute, 0, 0);
      const slotStartMs = slotStartDate.getTime();

      const slotEndDate = new Date(overtimeDate);
      slotEndDate.setHours(endHour, endMinute, 0, 0);
      let slotEndMs = slotEndDate.getTime();
      // Xử lý ca qua đêm
      if (slotEndMs < slotStartMs) {
        slotEndDate.setDate(slotEndDate.getDate() + 1);
        slotEndMs = slotEndDate.getTime();
      }

      // Tính điểm bắt đầu thực tế: max(slot_start, checkInTime)
      // Tính điểm kết thúc thực tế: min(slot_end, checkoutTime)
      const actualStartMs = Math.max(slotStartMs, checkInTimeMs);
      const actualEndMs = Math.min(slotEndMs, checkOutTimeMs);

      // Chỉ tính nếu có khoảng thời gian hợp lệ (actual_end > actual_start)
      // Và phải nằm trong khung giờ (checkout >= slot_start và checkIn <= slot_end)
      if (actualEndMs > actualStartMs 
          && checkOutTimeMs >= slotStartMs 
          && checkInTimeMs <= slotEndMs) {
        const actualSlotHours = (actualEndMs - actualStartMs) / (1000 * 60 * 60);
        totalActualHours += actualSlotHours;
      }
    }

    totalActualHours = Number(totalActualHours.toFixed(2));
    const plannedHours = Number(overtime.totalHours);
    const excessHours = Number((totalActualHours - plannedHours).toFixed(2));

    // Xác định status và số giờ được thanh toán
    let actualStatus: 'completed' | 'completed_early' | 'exceeded';
    let payableHours: number;
    let overtimeNote: string;

    if (totalActualHours <= 0) {
      // Checkout trước tất cả các khung giờ
      actualStatus = 'completed_early';
      payableHours = 0;
      const timeSlotsText = timeSlots.map(s => `${s.startTime}-${s.endTime}`).join(', ');
      overtimeNote = `Nhân viên checkout trước giờ bắt đầu tăng ca. Đăng ký: ${timeSlotsText}, Checkout: ${checkOutTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}.`;
    } else if (totalActualHours < plannedHours) {
      // Về sớm hơn đăng ký
      actualStatus = 'completed_early';
      payableHours = totalActualHours; // Trả theo giờ thực tế
      const shortHours = Math.abs(excessHours);
      overtimeNote = `Nhân viên về sớm hơn ${shortHours.toFixed(2)} giờ so với đăng ký. Đăng ký: ${plannedHours}h, Thực tế: ${totalActualHours}h.`;
    } else if (totalActualHours > plannedHours) {
      // Về muộn hơn đăng ký
      actualStatus = 'exceeded';
      payableHours = plannedHours; // CHỈ trả theo giờ đã duyệt
      overtimeNote = `Nhân viên làm thêm ${excessHours.toFixed(2)} giờ chưa được duyệt. Đăng ký: ${plannedHours}h, Thực tế: ${totalActualHours}h`;
    } else {
      // Đúng giờ
      actualStatus = 'completed';
      payableHours = totalActualHours;
      overtimeNote = `Nhân viên hoàn thành đúng giờ tăng ca đã đăng ký (${plannedHours}h).`;
    }

    // Cập nhật overtime record (chỉ tracking fields)
    overtime.excessHours = excessHours;
    overtime.actualStatus = actualStatus;
    await this.overtimeRepository.save(overtime);

    // Cập nhật attendance.overtimeHours với số giờ được thanh toán
    const attendance = await this.attendanceRepository.findOne({
      where: {
        employeeId,
        factoryId,
        attendanceDate,
      },
    });

    if (attendance) {
      // Trừ đi overtimeHours cũ (đã set khi approve), cộng payableHours thực tế
      const oldOvertimeHours = Number(attendance.overtimeHours || 0);
      const previousPayableHours = plannedHours; // Giờ đã được set khi approve

      // Tính lại: loại bỏ giờ dự kiến cũ, thêm giờ thực tế mới
      attendance.overtimeHours =
        oldOvertimeHours - previousPayableHours + payableHours;

      // Cập nhật ghi chú tăng ca
      attendance.overtimeNote = overtimeNote;

      await this.attendanceRepository.save(attendance);
    }

    return overtime;
  }

  /**
   * Tìm tất cả đơn tăng ca đã duyệt cho ngày cụ thể
   */
  async findApprovedOvertimesByDate(
    employeeId: number,
    factoryId: number,
    date: Date,
  ): Promise<Overtime[]> {
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    return this.overtimeRepository.find({
      where: {
        employeeId,
        factoryId,
        overtimeDate: attendanceDate,
        status: 'approved',
      },
    });
  }

  /**
   * Gửi notification cho tất cả HR trong factory khi đơn tăng ca được duyệt
   */
  private async sendNotificationToHR(
    factoryId: number,
    employeeName: string,
    overtimeDate: Date,
    startTime: string,
    endTime: string,
    totalHours: number,
    overtimeId: number
  ): Promise<void> {
    try {
      // Tìm tất cả employees có quyền receive_overtime_approved_notification trong factory
      let hrEmployees = await this.employeeRepository
        .createQueryBuilder('employee')
        .leftJoinAndSelect('employee.user', 'user')
        .leftJoinAndSelect('employee.roleGroups', 'roleGroups')
        .where('employee.factoryId = :factoryId', { factoryId })
        .getMany();
      
      // Filter by merged permissions (from roleGroups + permissions cũ)
      hrEmployees = hrEmployees.filter(emp => 
        hasEmployeePermission(emp, EMPLOYEE_PERMISSION.RECEIVE_OVERTIME_APPROVED_NOTIFICATION)
      );

      if (hrEmployees.length === 0) {
        this.debug(`No HR employees with overtime permission in factory ${factoryId}`);
        return;
      }

      const title = 'Đơn tăng ca đã được duyệt';
      const body = `${employeeName} đã được duyệt tăng ca ngày ${overtimeDate.toLocaleDateString(
        'vi-VN'
      )} (${startTime} - ${endTime}, ${totalHours}h)`;

      // Lọc các HR có userId
      const hrUserIds = hrEmployees
        .filter(hr => hr.userId)
        .map(hr => hr.userId);

      if (hrUserIds.length === 0) {
        this.warn('No HR employees with userId found');
        return;
      }

      // Gửi notification cho tất cả HR cùng lúc
      await this.notificationService.sendNotificationToMultipleUsers(
        hrUserIds,
        title,
        body,
        NOTIFICATION_TYPE.OVERTIME_APPROVED,
        overtimeId,
        {
          employeeName,
          overtimeDate: overtimeDate.toISOString(),
          startTime,
          endTime,
          totalHours,
          isHRNotification: true,
        }
      );

      this.log(
        `Sent overtime approval notification to ${hrEmployees.length} HR employee(s)`
      );
    } catch (error) {
      this.error('Error sending notification to HR:', error);
      // Không throw error để không ảnh hưởng đến flow chính
    }
  }

  /**
   * Gửi thông báo nhắc duyệt đến các approvers
   */
  async sendReminderToApprovers(id: number): Promise<void> {
    const overtime = await this.overtimeRepository.findOne({
      where: { id },
      relations: ['employee', 'employee.user'],
    });

    if (!overtime) {
      throwNotFoundError('Đơn tăng ca không tồn tại');
    }

    // Chỉ gửi reminder cho đơn đang pending
    if (overtime.status !== 'pending') {
      throwBadRequestError('Chỉ có thể gửi nhắc duyệt cho đơn đang chờ duyệt');
    }

    if (!overtime.approverEmployeeIds || overtime.approverEmployeeIds.length === 0) {
      throwBadRequestError('Đơn này không có người duyệt');
    }

    try {
      const employee = overtime.employee;
      const employeeName = employee?.user?.fullName || 'Nhân viên';

      const approvers = await this.employeeRepository.find({
        where: overtime.approverEmployeeIds.map((id) => ({ id })),
        relations: ['user'],
      });

      const approverUserIds = approvers
        .filter((a) => a?.userId)
        .map((a) => a.userId);

      if (approverUserIds.length > 0) {
        const overtimeDate = new Date(overtime.overtimeDate);

        await this.notificationService.sendNotificationToMultipleUsers(
          approverUserIds,
          'Nhắc duyệt đơn tăng ca',
          `${employeeName} đã tạo đơn tăng ca ngày ${overtimeDate.toLocaleDateString('vi-VN')} (${overtime.startTime} - ${overtime.endTime}) - Vui lòng xem xét duyệt`,
          NOTIFICATION_TYPE.OVERTIME_REMINDER,
          overtime.id,
          {
            employeeName,
            overtimeDate: overtimeDate.toISOString(),
            startTime: overtime.startTime,
            endTime: overtime.endTime,
            totalHours: overtime.totalHours,
            coefficientName: overtime.coefficientName,
          }
        );
      }
    } catch (error) {
      this.error('Error sending reminder notification:', error);
      throw error;
    }
  }
}
