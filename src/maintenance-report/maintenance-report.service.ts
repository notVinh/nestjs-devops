import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { MaintenanceReport, MaintenanceReportStatus } from './entities/maintenance-report.entity';
import { Employee } from 'src/employee/entities/employee.entity';
import { CreateMaintenanceReportDto } from './dto/create-maintenance-report.dto';
import { UpdateMaintenanceReportDto } from './dto/update-maintenance-report.dto';
import {
  IPaginationOptions,
  IPaginationResult,
} from 'src/utils/types/pagination-options.type';
import { NotificationService } from 'src/notification/notification.service';
import { NOTIFICATION_TYPE } from 'src/notification/constants/notification-type.constant';

@Injectable()
export class MaintenanceReportService {
  private readonly context = 'MaintenanceReportService';

  constructor(
    @InjectRepository(MaintenanceReport)
    private maintenanceReportRepository: Repository<MaintenanceReport>,
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

  // Nhân viên tạo báo cáo máy hỏng
  async create(
    employeeId: number,
    createDto: CreateMaintenanceReportDto
  ): Promise<MaintenanceReport> {
    const now = new Date();

    const maintenanceReport = this.maintenanceReportRepository.create({
      factoryId: createDto.factoryId,
      employeeId: employeeId,
      assignedEmployeeId: createDto.assignedEmployeeId,
      reportDate: now,
      machineCode: createDto.machineCode,
      machineName: createDto.machineName,
      issueDescription: createDto.issueDescription,
      priority: createDto.priority,
      photoUrls: createDto.photoUrls,
      note: createDto.note,
      status: MaintenanceReportStatus.PENDING,
    });

    const savedReport = await this.maintenanceReportRepository.save(maintenanceReport);

    // Gửi notification cho người được giao xử lý (nếu có)
    if (createDto.assignedEmployeeId) {
      try {
        const employee = await this.employeeRepository.findOne({
          where: { id: employeeId },
          relations: ['user'],
        });

        const assignedEmployee = await this.employeeRepository.findOne({
          where: { id: createDto.assignedEmployeeId },
          relations: ['user'],
        });

        if (assignedEmployee?.userId && employee?.user?.fullName) {
          const priorityText = createDto.priority === 'urgent' ? 'KHẨN CẤP' :
                               createDto.priority === 'high' ? 'Cao' :
                               createDto.priority === 'medium' ? 'Trung bình' : 'Thấp';

          await this.notificationService.sendNotificationToUser(
            assignedEmployee.userId,
            'Báo cáo bảo trì mới',
            `${employee.user.fullName} đã báo cáo máy ${createDto.machineName || createDto.machineCode} bị hỏng (Mức độ: ${priorityText})`,
            NOTIFICATION_TYPE.MAINTENANCE_REPORT_CREATED,
            savedReport.id,
            {
              employeeName: employee.user.fullName,
              machineCode: createDto.machineCode,
              machineName: createDto.machineName,
              issueDescription: createDto.issueDescription,
              priority: createDto.priority,
              reportDate: now.toISOString(),
            }
          );
        }
      } catch (error) {
        this.error('Error sending notification:', error);
        // Không throw error để không ảnh hưởng đến việc tạo maintenance report
      }
    }

    return savedReport;
  }

  // Xem lịch sử báo cáo của mình
  // Optimized: WHERE trước để filter sớm, sau đó mới JOIN
  async findMyReports(
    employeeId: number,
    options: IPaginationOptions,
    filters?: {
      startDate?: string;
      endDate?: string;
      status?: MaintenanceReportStatus;
      priority?: string;
    }
  ): Promise<IPaginationResult<MaintenanceReport>> {
    const queryBuilder = this.maintenanceReportRepository
      .createQueryBuilder('maintenanceReport')
      .where('maintenanceReport.employeeId = :employeeId', { employeeId })
      .leftJoin('maintenanceReport.employee', 'employee')
      .leftJoin('employee.user', 'employeeUser')
      .leftJoin('maintenanceReport.assignedEmployee', 'assignedEmployee')
      .leftJoin('assignedEmployee.user', 'assignedEmployeeUser')
      .leftJoin('maintenanceReport.factory', 'factory')
      .select([
        'maintenanceReport.id',
        'maintenanceReport.machineCode',
        'maintenanceReport.machineName',
        'maintenanceReport.issueDescription',
        'maintenanceReport.priority',
        'maintenanceReport.photoUrls',
        'maintenanceReport.status',
        'maintenanceReport.reportDate',
        'maintenanceReport.resolvedAt',
        'maintenanceReport.createdAt',
        // Employee info
        'employee.id',
        'employeeUser.id',
        'employeeUser.fullName',
        // Assigned Employee
        'assignedEmployee.id',
        'assignedEmployeeUser.id',
        'assignedEmployeeUser.fullName',
        // Factory
        'factory.id',
        'factory.name',
      ])
      .orderBy('maintenanceReport.createdAt', 'DESC');

    // Filter theo ngày
    if (filters?.startDate && filters?.endDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('maintenanceReport.reportDate BETWEEN :start AND :end', {
        start,
        end,
      });
    }

    // Filter theo status
    if (filters?.status) {
      queryBuilder.andWhere('maintenanceReport.status = :status', {
        status: filters.status,
      });
    }

    // Filter theo priority
    if (filters?.priority) {
      queryBuilder.andWhere('maintenanceReport.priority = :priority', {
        priority: filters.priority,
      });
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  // Xem báo cáo được giao cho mình xử lý
  // Optimized: WHERE trước để filter sớm, sau đó mới JOIN
  async findAssignedToMe(
    employeeId: number,
    options: IPaginationOptions,
    filters?: {
      startDate?: string;
      endDate?: string;
      status?: MaintenanceReportStatus;
      priority?: string;
    }
  ): Promise<IPaginationResult<MaintenanceReport>> {
    const queryBuilder = this.maintenanceReportRepository
      .createQueryBuilder('maintenanceReport')
      .where('maintenanceReport.assignedEmployeeId = :employeeId', { employeeId })
      .leftJoin('maintenanceReport.employee', 'employee')
      .leftJoin('employee.user', 'employeeUser')
      .leftJoin('maintenanceReport.assignedEmployee', 'assignedEmployee')
      .leftJoin('assignedEmployee.user', 'assignedEmployeeUser')
      .leftJoin('maintenanceReport.factory', 'factory')
      .select([
        'maintenanceReport.id',
        'maintenanceReport.machineCode',
        'maintenanceReport.machineName',
        'maintenanceReport.issueDescription',
        'maintenanceReport.priority',
        'maintenanceReport.photoUrls',
        'maintenanceReport.status',
        'maintenanceReport.reportDate',
        'maintenanceReport.resolvedAt',
        'maintenanceReport.createdAt',
        // Employee info (người báo cáo)
        'employee.id',
        'employeeUser.id',
        'employeeUser.fullName',
        // Assigned Employee
        'assignedEmployee.id',
        'assignedEmployeeUser.id',
        'assignedEmployeeUser.fullName',
        // Factory
        'factory.id',
        'factory.name',
      ])
      .orderBy('maintenanceReport.createdAt', 'DESC');

    // Filter theo ngày
    if (filters?.startDate && filters?.endDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('maintenanceReport.reportDate BETWEEN :start AND :end', {
        start,
        end,
      });
    }

    // Filter theo status
    if (filters?.status) {
      queryBuilder.andWhere('maintenanceReport.status = :status', {
        status: filters.status,
      });
    }

    // Filter theo priority
    if (filters?.priority) {
      queryBuilder.andWhere('maintenanceReport.priority = :priority', {
        priority: filters.priority,
      });
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
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
      assignedEmployeeId?: number;
      departmentId?: number;
      status?: MaintenanceReportStatus;
      priority?: string;
    }
  ): Promise<IPaginationResult<MaintenanceReport>> {
    const queryBuilder = this.maintenanceReportRepository
      .createQueryBuilder('maintenanceReport')
      .where('maintenanceReport.factoryId = :factoryId', { factoryId })
      .leftJoin('maintenanceReport.employee', 'employee')
      .leftJoin('employee.user', 'employeeUser')
      .leftJoin('employee.position', 'position')
      .leftJoin('employee.department', 'department')
      .leftJoin('maintenanceReport.assignedEmployee', 'assignedEmployee')
      .leftJoin('assignedEmployee.user', 'assignedEmployeeUser')
      .leftJoin('maintenanceReport.factory', 'factory')
      .select([
        'maintenanceReport.id',
        'maintenanceReport.machineCode',
        'maintenanceReport.machineName',
        'maintenanceReport.issueDescription',
        'maintenanceReport.priority',
        'maintenanceReport.photoUrls',
        'maintenanceReport.status',
        'maintenanceReport.reportDate',
        'maintenanceReport.resolvedAt',
        'maintenanceReport.createdAt',
        'maintenanceReport.updatedAt',
        // Employee info (người báo cáo)
        'employee.id',
        'employeeUser.id',
        'employeeUser.fullName',
        // Position & Department
        'position.id',
        'position.name',
        'department.id',
        'department.name',
        // Assigned Employee (người xử lý)
        'assignedEmployee.id',
        'assignedEmployeeUser.id',
        'assignedEmployeeUser.fullName',
        // Factory
        'factory.id',
        'factory.name',
      ])
      .orderBy('maintenanceReport.createdAt', 'DESC');

    // Filter theo ngày
    if (filters?.startDate && filters?.endDate) {
      const start = new Date(filters.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('maintenanceReport.reportDate BETWEEN :start AND :end', {
        start,
        end,
      });
    }

    // Filter theo nhân viên báo cáo
    if (filters?.employeeId) {
      queryBuilder.andWhere('maintenanceReport.employeeId = :employeeId', {
        employeeId: filters.employeeId,
      });
    }

    // Filter theo nhân viên được giao
    if (filters?.assignedEmployeeId) {
      queryBuilder.andWhere('maintenanceReport.assignedEmployeeId = :assignedEmployeeId', {
        assignedEmployeeId: filters.assignedEmployeeId,
      });
    }

    // Filter theo phòng ban
    if (filters?.departmentId) {
      queryBuilder.andWhere('employee.departmentId = :departmentId', {
        departmentId: filters.departmentId,
      });
    }

    // Filter theo status
    if (filters?.status) {
      queryBuilder.andWhere('maintenanceReport.status = :status', {
        status: filters.status,
      });
    }

    // Filter theo priority
    if (filters?.priority) {
      queryBuilder.andWhere('maintenanceReport.priority = :priority', {
        priority: filters.priority,
      });
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  // Xem chi tiết báo cáo
  async findOne(id: number): Promise<MaintenanceReport> {
    const report = await this.maintenanceReportRepository.findOne({
      where: { id },
      relations: [
        'employee',
        'employee.user',
        'employee.position',
        'employee.department',
        'assignedEmployee',
        'assignedEmployee.user',
        'factory',
      ],
    });

    if (!report) {
      throw new NotFoundException(`Maintenance report #${id} not found`);
    }

    return report;
  }

  // Cập nhật báo cáo (chuyển trạng thái, gán người xử lý, thêm ghi chú)
  async update(
    id: number,
    updateDto: UpdateMaintenanceReportDto
  ): Promise<MaintenanceReport> {
    const report = await this.findOne(id);

    // Check if this is newly resolved
    const isNewlyResolved =
      updateDto.status === MaintenanceReportStatus.RESOLVED &&
      report.status !== MaintenanceReportStatus.RESOLVED;

    // Check if reassigned to different employee
    const isReassigned =
      updateDto.assignedEmployeeId &&
      updateDto.assignedEmployeeId !== report.assignedEmployeeId;

    // Nếu chuyển sang resolved, set resolvedAt
    if (isNewlyResolved) {
      updateDto['resolvedAt'] = new Date();
    }

    Object.assign(report, updateDto);

    const updatedReport = await this.maintenanceReportRepository.save(report);

    // Query employee (reporter) 1 lần nếu cần cho cả resolved và reassign notification
    let reporter: Employee | null = null;
    if (isNewlyResolved || isReassigned) {
      reporter = await this.employeeRepository.findOne({
        where: { id: report.employeeId },
        relations: ['user'],
      });

      if (!reporter) {
        this.warn(`Reporter employee not found: ${report.employeeId}`);
      }
    }

    // Gửi notification cho người báo cáo khi resolved
    if (isNewlyResolved && reporter) {
      try {
        if (!reporter.userId) {
          this.warn(`Reporter has no userId: ${report.employeeId}`);
        } else {
          const machineName = report.machineName || report.machineCode;
          await this.notificationService.sendNotificationToUser(
            reporter.userId,
            'Báo cáo bảo trì đã được giải quyết',
            `Báo cáo máy ${machineName} đã được xử lý xong`,
            NOTIFICATION_TYPE.MAINTENANCE_REPORT_RESOLVED,
            report.id,
            {
              machineCode: report.machineCode,
              machineName: report.machineName,
              issueDescription: report.issueDescription,
              resolvedAt: updateDto['resolvedAt'].toISOString(),
            }
          );
        }
      } catch (error) {
        this.error('Error sending resolved notification:', error);
      }
    }

    // Gửi notification cho người mới được assign
    if (isReassigned) {
      try {
        const newAssignedEmployee = await this.employeeRepository.findOne({
          where: { id: updateDto.assignedEmployeeId },
          relations: ['user'],
        });

        if (!newAssignedEmployee) {
          this.warn(`New assigned employee not found: ${updateDto.assignedEmployeeId}`);
        } else if (!newAssignedEmployee.userId) {
          this.warn(`New assigned employee has no userId: ${updateDto.assignedEmployeeId}`);
        } else {
          const reporterName = reporter?.user?.fullName || 'Nhân viên';
          const machineName = report.machineName || report.machineCode;
          const priorityText = report.priority === 'urgent' ? 'KHẨN CẤP' :
                               report.priority === 'high' ? 'Cao' :
                               report.priority === 'medium' ? 'Trung bình' : 'Thấp';

          await this.notificationService.sendNotificationToUser(
            newAssignedEmployee.userId,
            'Báo cáo bảo trì được giao cho bạn',
            `${reporterName} đã báo cáo máy ${machineName} bị hỏng (Mức độ: ${priorityText})`,
            NOTIFICATION_TYPE.MAINTENANCE_REPORT_REASSIGNED,
            report.id,
            {
              employeeName: reporterName,
              machineCode: report.machineCode,
              machineName: report.machineName,
              issueDescription: report.issueDescription,
              priority: report.priority,
            }
          );
        }
      } catch (error) {
        this.error('Error sending reassign notification:', error);
      }
    }

    return updatedReport;
  }

  // Xóa báo cáo (soft delete)
  async remove(id: number): Promise<void> {
    const report = await this.findOne(id);
    await this.maintenanceReportRepository.softRemove(report);
  }
}
