import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import ExcelJS from 'exceljs';
import { OvernightReport } from './entities/overnight-report.entity';
import { Employee } from 'src/employee/entities/employee.entity';
import { Factory } from 'src/factory/entities/factory.entity';
import { CreateOvernightReportDto } from './dto/create-overnight-report.dto';
import { PaginationHelper } from 'src/utils/pagination.helper';
import {
  IPaginationOptions,
  IPaginationResult,
} from 'src/utils/types/pagination-options.type';
import { OVERNIGHT_REPORT_STATUS } from 'src/utils/constant';
import { NotificationService } from 'src/notification/notification.service';
import { NOTIFICATION_TYPE } from 'src/notification/constants/notification-type.constant';

@Injectable()
export class OvernightReportService {
  private readonly context = 'OvernightReportService';

  constructor(
    @InjectRepository(OvernightReport)
    private overnightReportRepository: Repository<OvernightReport>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Factory)
    private readonly factoryRepository: Repository<Factory>,
    private readonly notificationService: NotificationService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
  ) {}

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

  // Nhân viên tạo báo cáo qua đêm
  async create(
    employeeId: number,
    createDto: CreateOvernightReportDto
  ): Promise<OvernightReport> {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overnightReport = this.overnightReportRepository.create({
      factoryId: createDto.factoryId,
      employeeId: employeeId,
      reportDate: today,
      reportTime: now,
      location: createDto.location || undefined,
      address: createDto.address || undefined,
      note: createDto.note || undefined,
      status: OVERNIGHT_REPORT_STATUS.REPORTED,
      receiverEmployeeIds: createDto.receiverEmployeeIds,
      photoUrls: createDto.photoUrls || undefined,
    });

    const savedReport = await this.overnightReportRepository.save(overnightReport);

    // Gửi notification cho tất cả người nhận báo cáo
    if (createDto.receiverEmployeeIds && createDto.receiverEmployeeIds.length > 0) {
      try {
        const employee = await this.employeeRepository.findOne({
          where: { id: employeeId },
          relations: ['user'],
        });

        // Lấy thông tin tất cả người nhận
        const receivers = await this.employeeRepository.find({
          where: createDto.receiverEmployeeIds.map(id => ({ id })),
          relations: ['user'],
        });

        const employeeName = employee?.user?.fullName || 'Nhân viên';

        // Lọc các receiver có userId
        const receiverUserIds = receivers
          .filter(r => r?.userId)
          .map(r => r.userId);

        if (receiverUserIds.length > 0) {
          // Gửi notification cho tất cả receivers cùng lúc
          await this.notificationService.sendNotificationToMultipleUsers(
            receiverUserIds,
            'Báo cáo qua đêm mới',
            `${employeeName} đã báo cáo vị trí qua đêm${
              createDto.address ? ` tại ${createDto.address}` : ''
            }`,
            NOTIFICATION_TYPE.OVERNIGHT_REPORT_CREATED,
            savedReport.id,
            {
              employeeName,
              address: createDto.address || '',
              reportTime: now.toISOString(),
              location: createDto.location,
            }
          );
        }
      } catch (error) {
        this.error('Error sending notifications:', error);
        // Không throw error để không ảnh hưởng đến việc tạo report
      }
    }

    return savedReport;
  }

  // Xem lịch sử báo cáo của mình
  async findMyReports(
    employeeId: number,
    options: IPaginationOptions,
    startDate?: string,
    endDate?: string
  ): Promise<IPaginationResult<OvernightReport>> {
    try {
      const where: any = { employeeId };

      if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.reportDate = Between(start, end);
      }

      return PaginationHelper.paginate(
        this.overnightReportRepository,
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

  // Lấy báo cáo được gửi đến tôi (tôi là người nhận)
  async findReportsAssignedToMe(
    employeeId: number,
    options: IPaginationOptions,
    startDate?: string,
    endDate?: string
  ): Promise<IPaginationResult<OvernightReport>> {
    try {
      const queryBuilder = this.overnightReportRepository
        .createQueryBuilder('report')
        .where(`report.receiverEmployeeIds @> :employeeId::jsonb`, {
          employeeId: JSON.stringify([employeeId]),
        })
        .leftJoinAndSelect('report.employee', 'employee')
        .leftJoinAndSelect('employee.user', 'user')
        .leftJoinAndSelect('employee.position', 'position')
        .leftJoinAndSelect('employee.department', 'department')
        .leftJoinAndSelect('report.factory', 'factory')
        .orderBy('report.createdAt', 'DESC');

      if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        queryBuilder.andWhere('report.reportDate BETWEEN :start AND :end', {
          start,
          end,
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
      this.error('Error finding reports assigned to me', {
        context: this.context,
        trace: error?.stack || error,
      });
      throw error;
    }
  }

  // Quản lý xem tất cả báo cáo của factory
  async findByFactory(
    factoryId: number,
    options: IPaginationOptions,
    filters?: {
      startDate?: string;
      endDate?: string;
      employeeId?: number;
      departmentId?: number;
      status?: string;
    }
  ): Promise<IPaginationResult<OvernightReport>> {
    try {
      const queryBuilder = this.overnightReportRepository
        .createQueryBuilder('overnightReport')
        .where('overnightReport.factoryId = :factoryId', { factoryId })
        .leftJoin('overnightReport.employee', 'employee')
        .leftJoin('employee.user', 'employeeUser')
        .leftJoin('employee.position', 'position')
        .leftJoin('employee.department', 'department')
        .leftJoin('overnightReport.factory', 'factory')
        .select([
          'overnightReport.id',
          'overnightReport.reportDate',
          'overnightReport.reportTime',
          'overnightReport.status',
          'overnightReport.note',
          'overnightReport.location',
          'overnightReport.address',
          'overnightReport.photoUrls',
          'overnightReport.receiverEmployeeIds',
          'overnightReport.createdAt',
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
        ])
        .orderBy('overnightReport.createdAt', 'DESC');

      // Filter theo ngày
      if (filters?.startDate && filters?.endDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        queryBuilder.andWhere(
          'overnightReport.reportDate BETWEEN :start AND :end',
          {
            start,
            end,
          }
        );
      }

      // Filter theo nhân viên
      if (filters?.employeeId) {
        queryBuilder.andWhere('overnightReport.employeeId = :employeeId', {
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
        queryBuilder.andWhere('overnightReport.status = :status', {
          status: filters.status,
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
  async findOne(id: number): Promise<OvernightReport> {
    try {
      const report = await this.overnightReportRepository.findOne({
        where: { id },
        relations: [
          'employee',
          'employee.user',
          'employee.position',
          'employee.department',
          'factory',
        ],
      });

      if (!report) {
        throw new NotFoundException('Không tìm thấy báo cáo qua đêm');
      }

      // Lấy thông tin người nhận
      if (report.receiverEmployeeIds && report.receiverEmployeeIds.length > 0) {
        const receivers = await this.employeeRepository.find({
          where: report.receiverEmployeeIds.map(id => ({ id })),
          relations: ['user', 'position', 'department'],
        });
        (report as any).receivers = receivers;
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

  // ========== XLSX EXPORT ==========

  private setThinBorder(cell: ExcelJS.Cell) {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };
  }

  private getDayOfWeek(day: number): string {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return days[day];
  }

  // Xuất báo cáo qua đêm theo tháng - chỉ hiển thị nhân viên có báo cáo
  async generateOvernightReportXLSX(
    factoryId: number,
    year: number,
    month: number
  ): Promise<ArrayBuffer> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Lấy thông tin nhà máy
    const factory = await this.factoryRepository.findOne({
      where: { id: factoryId },
    });

    // Lấy tất cả báo cáo qua đêm trong tháng
    const reports = await this.overnightReportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.employee', 'employee')
      .leftJoinAndSelect('employee.user', 'user')
      .leftJoinAndSelect('employee.position', 'position')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('employee.team', 'team')
      .where('report.factoryId = :factoryId', { factoryId })
      .andWhere('report.reportDate >= :startDate', { startDate })
      .andWhere('report.reportDate <= :endDate', { endDate })
      .orderBy('report.reportDate', 'ASC')
      .getMany();

    // Tạo map báo cáo theo employeeId và ngày
    const reportMap = new Map<string, OvernightReport>();
    const employeesWithReports = new Map<number, Employee>();

    reports.forEach(report => {
      const reportDate = new Date(report.reportDate);
      const day = reportDate.getDate();
      const key = `${report.employeeId}_${day}`;
      reportMap.set(key, report);

      // Lưu thông tin nhân viên có báo cáo
      if (report.employee && !employeesWithReports.has(report.employeeId)) {
        employeesWithReports.set(report.employeeId, report.employee);
      }
    });

    // Tạo workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Báo cáo qua đêm');

    const totalCols = 4 + daysInMonth; // STT chung + STT phòng ban + Tên + Vị trí + các ngày

    // Row 1: Tên nhà máy
    sheet.addRow([factory?.name ?? 'Nhà máy']);
    sheet.mergeCells(1, 1, 1, totalCols + 1); // +1 for Tổng cộng
    const factoryNameCell = sheet.getCell(1, 1);
    factoryNameCell.font = { bold: true, size: 16 };
    factoryNameCell.alignment = { horizontal: 'left' };

    // Row 2: Tiêu đề
    sheet.addRow([`Bảng tổng hợp báo cáo qua đêm tháng ${month}/${year}`]);
    sheet.mergeCells(2, 1, 2, totalCols + 1);
    const titleCell = sheet.getCell(2, 1);
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    // Row 3 & 4: Header
    const headerRow1 = sheet.addRow([
      'STT',
      '',
      'Tên nhân viên',
      'Vị trí',
      ...Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`),
      'Tổng',
    ]);
    const headerRow2 = sheet.addRow([
      '',
      '',
      '',
      '',
      ...Array.from({ length: daysInMonth }, (_, i) =>
        this.getDayOfWeek(new Date(year, month - 1, i + 1).getDay())
      ),
      '',
    ]);

    // Merge header cells
    sheet.mergeCells(3, 1, 3, 2); // STT header
    sheet.mergeCells(3, 3, 4, 3); // Tên nhân viên
    sheet.mergeCells(3, 4, 4, 4); // Vị trí
    sheet.mergeCells(3, totalCols + 1, 4, totalCols + 1); // Tổng

    // Style headers
    [headerRow1, headerRow2].forEach(r => {
      r.eachCell(cell => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        this.setThinBorder(cell);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6F0FF' },
        };
      });
    });

    // Column widths
    sheet.getColumn(1).width = 6; // STT chung
    sheet.getColumn(2).width = 6; // STT phòng ban
    sheet.getColumn(3).width = 24; // Tên
    sheet.getColumn(4).width = 16; // Vị trí
    for (let col = 5; col <= totalCols; col++) {
      sheet.getColumn(col).width = 5; // Day columns
    }
    sheet.getColumn(totalCols + 1).width = 8; // Tổng

    // Nhóm nhân viên theo phòng ban
    const employeesByDepartment = new Map<string, Map<string, Employee[]>>();

    employeesWithReports.forEach(employee => {
      const deptName = (employee as any).department?.name || 'Chưa xác định';
      const teamName = (employee as any).team?.name || 'Chưa phân tổ';

      if (!employeesByDepartment.has(deptName)) {
        employeesByDepartment.set(deptName, new Map());
      }

      const deptMap = employeesByDepartment.get(deptName)!;
      if (!deptMap.has(teamName)) {
        deptMap.set(teamName, []);
      }

      deptMap.get(teamName)!.push(employee);
    });

    // Sắp xếp phòng ban
    const sortedDepartments = Array.from(employeesByDepartment.keys()).sort();

    let index = 1;
    for (const deptName of sortedDepartments) {
      // Department header row
      const deptRow = sheet.addRow([deptName]);
      sheet.mergeCells(deptRow.number, 1, deptRow.number, totalCols + 1);
      const deptCell = sheet.getCell(deptRow.number, 1);
      deptCell.font = { bold: true };
      deptCell.alignment = { horizontal: 'left' };
      deptCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD8EAD3' },
      };

      const teamsInDept = employeesByDepartment.get(deptName)!;
      const sortedTeams = Array.from(teamsInDept.keys()).sort((a, b) => {
        if (a === 'Chưa phân tổ') return 1;
        if (b === 'Chưa phân tổ') return -1;
        return a.localeCompare(b);
      });

      let deptIndex = 1;
      for (const teamName of sortedTeams) {
        // Team header row
        if (sortedTeams.length > 1 || teamName !== 'Chưa phân tổ') {
          const teamRow = sheet.addRow([`  ${teamName}`]);
          sheet.mergeCells(teamRow.number, 1, teamRow.number, totalCols + 1);
          const teamCell = sheet.getCell(teamRow.number, 1);
          teamCell.font = { bold: true, italic: true };
          teamCell.alignment = { horizontal: 'left' };
          teamCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0F4C3' },
          };
        }

        const employees = teamsInDept.get(teamName)!;
        for (const employee of employees) {
          const rowValues: (string | number)[] = [
            index,
            deptIndex,
            (employee as any).user?.fullName || '',
            (employee as any).position?.name || 'Chưa xác định',
          ];

          let totalReports = 0;

          // Thêm dữ liệu từng ngày
          for (let day = 1; day <= daysInMonth; day++) {
            const key = `${employee.id}_${day}`;
            const hasReport = reportMap.has(key);

            if (hasReport) {
              rowValues.push('x');
              totalReports++;
            } else {
              rowValues.push('');
            }
          }

          // Tổng số ngày báo cáo
          rowValues.push(totalReports);

          const r = sheet.addRow(rowValues);

          // Style cells
          for (let c = 1; c <= totalCols + 1; c++) {
            const rc = r.getCell(c);
            this.setThinBorder(rc);

            if (c === 1 || c === 2) {
              rc.alignment = { horizontal: 'center', vertical: 'middle' };
            } else if (c >= 5 && c <= 4 + daysInMonth) {
              rc.alignment = { horizontal: 'center', vertical: 'middle' };

              // Highlight cells có báo cáo
              if (rc.value === 'x') {
                rc.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFE6D5FF' }, // Light purple
                };
                rc.font = { bold: true };
              }

              // Ngày Chủ nhật tô màu xám nhạt
              const day = c - 4;
              const dow = new Date(year, month - 1, day).getDay();
              if (dow === 0 && rc.value !== 'x') {
                rc.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFEFEFEF' },
                };
              }
            } else if (c === totalCols + 1) {
              rc.alignment = { horizontal: 'center', vertical: 'middle' };
              rc.font = { bold: true };
            }
          }

          index++;
          deptIndex++;
        }
      }
    }

    // Nếu không có báo cáo nào
    if (employeesWithReports.size === 0) {
      const emptyRow = sheet.addRow(['Không có báo cáo qua đêm trong tháng này']);
      sheet.mergeCells(emptyRow.number, 1, emptyRow.number, totalCols + 1);
      const emptyCell = sheet.getCell(emptyRow.number, 1);
      emptyCell.alignment = { horizontal: 'center' };
      emptyCell.font = { italic: true };
    }

    return await workbook.xlsx.writeBuffer();
  }
}
