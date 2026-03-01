import { Injectable, Inject } from '@nestjs/common';
import {
  throwBadRequestError,
  throwNotFoundError,
} from '../utils/error.helper';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import ExcelJS from 'exceljs';
import { LeaveRequest } from './entities/leave-request.entity';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { Employee } from '../employee/entities/employee.entity';
import { Factory } from '../factory/entities/factory.entity';
import { LeaveType } from '../leave-type/entities/leave-type.entity';
import {
  IPaginationOptions,
  IPaginationResult,
} from 'src/utils/types/pagination-options.type';
import { NotificationService } from 'src/notification/notification.service';
import { NOTIFICATION_TYPE } from 'src/notification/constants/notification-type.constant';
import { LeaveTypeService } from 'src/leave-type/leave-type.service';
import { EMPLOYEE_PERMISSION } from 'src/employee/constants/employee-permission.constant';
import { hasEmployeePermission } from 'src/utils/employee-permissions.helper';

@Injectable()
export class LeaveRequestService {
  private readonly context = 'LeaveRequestService';

  constructor(
    @InjectRepository(LeaveRequest)
    private readonly leaveRepository: Repository<LeaveRequest>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Factory)
    private readonly factoryRepository: Repository<Factory>,
    @InjectRepository(LeaveType)
    private readonly leaveTypeRepository: Repository<LeaveType>,
    private readonly notificationService: NotificationService,
    private readonly leaveTypeService: LeaveTypeService,
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

  async create(dto: CreateLeaveRequestDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate > endDate) {
      throwBadRequestError('startDate phải nhỏ hơn hoặc bằng endDate');
    }

    const leaveSession = dto.leaveSession || 'full_day';

    // Validate: chỉ được chọn buổi sáng/chiều khi nghỉ 1 ngày
    if (
      (leaveSession === 'morning' || leaveSession === 'afternoon') &&
      startDate.getTime() !== endDate.getTime()
    ) {
      throwBadRequestError(
        'Chỉ có thể chọn nghỉ nửa ngày (buổi sáng/chiều) khi nghỉ trong 1 ngày'
      );
    }

    const totalDays = this.calculateTotalDays(startDate, endDate, leaveSession);

    // Xác định loại nghỉ phép
    let leaveType: 'paid' | 'unpaid' = dto.leaveType || 'paid';
    let leaveTypeId: number | null = dto.leaveTypeId ?? null;
    let deductsFromAnnualLeave = true;

    // Nếu có leaveTypeId, lấy thông tin từ bảng LeaveType
    if (dto.leaveTypeId) {
      const leaveTypeEntity = await this.leaveTypeService.findOne(dto.leaveTypeId);
      if (leaveTypeEntity) {
        leaveType = leaveTypeEntity.isPaid ? 'paid' : 'unpaid';
        deductsFromAnnualLeave = leaveTypeEntity.deductsFromAnnualLeave;
      }
    }

    // TODO: Tạm bỏ logic kiểm tra số ngày phép còn lại
    // if (leaveType === 'paid' && deductsFromAnnualLeave) {
    //   const employee = await this.employeeRepository.findOne({
    //     where: { id: dto.employeeId },
    //   });

    //   if (!employee) {
    //     throwNotFoundError('Nhân viên không tồn tại');
    //   }

    //   const availableLeaveDays = Number(employee.availableLeaveDays);

    //   if (availableLeaveDays < totalDays) {
    //     throwBadRequestError(
    //       `Không đủ số ngày phép. Bạn còn ${availableLeaveDays} ngày phép, nhưng đang xin ${totalDays} ngày`
    //     );
    //   }
    // }

    // Xử lý approverEmployeeIds (ưu tiên) hoặc approverEmployeeId (legacy)
    const approverEmployeeIds = dto.approverEmployeeIds?.length
      ? dto.approverEmployeeIds
      : dto.approverEmployeeId
        ? [dto.approverEmployeeId]
        : [];

    if (approverEmployeeIds.length === 0) {
      throwBadRequestError('Phải có ít nhất một người duyệt');
    }

    const entity: Partial<LeaveRequest> = {
      factoryId: dto.factoryId,
      employeeId: dto.employeeId,
      approverEmployeeId: approverEmployeeIds[0], // Legacy: lưu người đầu tiên
      approverEmployeeIds, // Danh sách tất cả người được giao duyệt
      leaveType,
      leaveTypeId,
      leaveSession,
      startDate,
      endDate,
      totalDays,
      reason: dto.reason ?? null,
      status: 'pending',
    };
    const leaveRequest = await this.leaveRepository.save(
      this.leaveRepository.create(entity)
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
          const leaveTypeText = leaveType === 'paid' ? 'có lương' : 'không lương';

          await this.notificationService.sendNotificationToMultipleUsers(
            approverUserIds,
            'Đơn nghỉ phép mới',
            `${employee.user.fullName} đã tạo đơn nghỉ ${leaveTypeText} từ ${startDate.toLocaleDateString(
              'vi-VN'
            )} đến ${endDate.toLocaleDateString('vi-VN')}`,
            NOTIFICATION_TYPE.LEAVE_REQUEST_CREATED,
            leaveRequest.id,
            {
              employeeName: employee.user.fullName,
              leaveType,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              totalDays,
            }
          );
        }
      }
    } catch (error) {
      this.error('Error sending notification:', error);
      // Không throw error để không ảnh hưởng đến việc tạo leave request
    }

    // Load lại đầy đủ relations để trả về cho client
    return this.findOne(leaveRequest.id);
  }

  async findOne(id: number) {
    const found = await this.leaveRepository.findOne({
      where: { id },
      relations: ['employee', 'employee.user', 'approver', 'approver.user', 'decidedBy', 'decidedBy.user', 'leaveTypeRef'],
    });
    if (!found) {
      throwNotFoundError('Đơn nghỉ phép không tồn tại');
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
    }
  ): Promise<IPaginationResult<LeaveRequest>> {
    const queryBuilder = this.leaveRepository
      .createQueryBuilder('leaveRequest')
      .where('leaveRequest.factoryId = :factoryId', { factoryId })
      .leftJoin('leaveRequest.employee', 'employee')
      .leftJoin('employee.user', 'employeeUser')
      .leftJoin('leaveRequest.approver', 'approver')
      .leftJoin('approver.user', 'approverUser')
      .leftJoin('leaveRequest.decidedBy', 'decidedBy')
      .leftJoin('decidedBy.user', 'decidedByUser')
      .leftJoin('leaveRequest.leaveTypeRef', 'leaveTypeRef')
      .select([
        'leaveRequest.id',
        'leaveRequest.leaveType',
        'leaveRequest.leaveTypeId',
        'leaveRequest.leaveSession',
        'leaveRequest.startDate',
        'leaveRequest.endDate',
        'leaveRequest.totalDays',
        'leaveRequest.reason',
        'leaveRequest.status',
        'leaveRequest.decidedAt',
        'leaveRequest.createdAt',
        'leaveRequest.approverEmployeeIds',
        'leaveRequest.decidedByEmployeeId',
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
        // LeaveType info
        'leaveTypeRef.id',
        'leaveTypeRef.code',
        'leaveTypeRef.name',
        'leaveTypeRef.isPaid',
        'leaveTypeRef.deductsFromAnnualLeave',
      ])
      .orderBy('leaveRequest.createdAt', 'DESC');

    if (filters?.status) {
      queryBuilder.andWhere('leaveRequest.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.startDate && filters?.endDate) {
      // Include leave requests that overlap with the date range
      // A leave request overlaps if: startDate <= filterEndDate AND endDate >= filterStartDate
      queryBuilder.andWhere('leaveRequest.startDate <= :endDate', {
        endDate: filters.endDate,
      });
      queryBuilder.andWhere('leaveRequest.endDate >= :startDate', {
        startDate: filters.startDate,
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

  // Helper: Load approvers cho danh sách leave requests
  private async loadApproversForList(leaveRequests: LeaveRequest[]): Promise<void> {
    // Thu thập tất cả approverEmployeeIds unique
    const allApproverIds = new Set<number>();
    for (const lr of leaveRequests) {
      if (lr.approverEmployeeIds?.length) {
        lr.approverEmployeeIds.forEach(id => allApproverIds.add(Number(id)));
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

    // Gán approvers cho từng leave request
    for (const lr of leaveRequests) {
      if (lr.approverEmployeeIds?.length) {
        (lr as any).approvers = lr.approverEmployeeIds
          .map(id => approverMap.get(Number(id)))
          .filter(Boolean);
      }
    }
  }

  // Lấy danh sách đơn nghỉ phép được giao cho mình duyệt
  async findAssignedToMe(
    options: IPaginationOptions,
    employeeId: number,
    filters?: {
      status?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<IPaginationResult<LeaveRequest>> {
    // Tạo query builder - tìm đơn được giao cho mình duyệt (trong approverEmployeeIds hoặc approverEmployeeId legacy)
    const queryBuilder = this.leaveRepository
      .createQueryBuilder('leaveRequest')
      .where('(:employeeId = ANY("leaveRequest"."approverEmployeeIds") OR "leaveRequest"."approverEmployeeId" = :employeeId)', { employeeId })
      .leftJoin('leaveRequest.employee', 'employee')
      .leftJoin('employee.user', 'employeeUser')
      .leftJoin('leaveRequest.approver', 'approver')
      .leftJoin('approver.user', 'approverUser')
      .leftJoin('leaveRequest.decidedBy', 'decidedBy')
      .leftJoin('decidedBy.user', 'decidedByUser')
      .leftJoin('leaveRequest.leaveTypeRef', 'leaveTypeRef')
      .select([
        'leaveRequest.id',
        'leaveRequest.leaveType',
        'leaveRequest.leaveTypeId',
        'leaveRequest.leaveSession',
        'leaveRequest.startDate',
        'leaveRequest.endDate',
        'leaveRequest.totalDays',
        'leaveRequest.reason',
        'leaveRequest.status',
        'leaveRequest.decidedAt',
        'leaveRequest.createdAt',
        'leaveRequest.approverEmployeeIds',
        'leaveRequest.decidedByEmployeeId',
        // Employee info (người xin nghỉ)
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
        // LeaveType info
        'leaveTypeRef.id',
        'leaveTypeRef.code',
        'leaveTypeRef.name',
        'leaveTypeRef.isPaid',
        'leaveTypeRef.deductsFromAnnualLeave',
      ])
      .orderBy('leaveRequest.createdAt', 'DESC');

    // Thêm bộ lọc theo status
    if (filters?.status) {
      queryBuilder.andWhere('leaveRequest.status = :status', {
        status: filters.status,
      });
    }

    // Thêm bộ lọc theo khoảng thời gian
    if (filters?.startDate && filters?.endDate) {
      // Include leave requests that overlap with the date range
      // A leave request overlaps if: startDate <= filterEndDate AND endDate >= filterStartDate
      queryBuilder.andWhere('leaveRequest.startDate <= :endDate', {
        endDate: filters.endDate,
      });
      queryBuilder.andWhere('leaveRequest.endDate >= :startDate', {
        startDate: filters.startDate,
      });
    }

    // Lấy dữ liệu và tổng số lượng
    const [data, total] = await queryBuilder
      .skip((options.page - 1) * options.limit)
      .take(options.limit)
      .getManyAndCount();

    // Load approvers từ approverEmployeeIds
    await this.loadApproversForList(data);

    // Trả về dữ liệu và thông tin phân trang
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

  // Optimized: WHERE trước để filter sớm, sau đó mới JOIN
  async findAllByEmployee(
    options: IPaginationOptions,
    employeeId: number,
    filters?: {
      status?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<IPaginationResult<LeaveRequest>> {
    // Tạo query builder
    const queryBuilder = this.leaveRepository
      .createQueryBuilder('leaveRequest')
      .where('leaveRequest.employeeId = :employeeId', { employeeId })
      .leftJoin('leaveRequest.employee', 'employee')
      .leftJoin('employee.user', 'employeeUser')
      .leftJoin('leaveRequest.approver', 'approver')
      .leftJoin('approver.user', 'approverUser')
      .leftJoin('leaveRequest.decidedBy', 'decidedBy')
      .leftJoin('decidedBy.user', 'decidedByUser')
      .leftJoin('leaveRequest.leaveTypeRef', 'leaveTypeRef')
      .select([
        'leaveRequest.id',
        'leaveRequest.leaveType',
        'leaveRequest.leaveTypeId',
        'leaveRequest.leaveSession',
        'leaveRequest.startDate',
        'leaveRequest.endDate',
        'leaveRequest.totalDays',
        'leaveRequest.reason',
        'leaveRequest.status',
        'leaveRequest.decidedAt',
        'leaveRequest.createdAt',
        'leaveRequest.approverEmployeeIds',
        'leaveRequest.decidedByEmployeeId',
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
        // LeaveType info
        'leaveTypeRef.id',
        'leaveTypeRef.code',
        'leaveTypeRef.name',
        'leaveTypeRef.isPaid',
        'leaveTypeRef.deductsFromAnnualLeave',
      ])
      .orderBy('leaveRequest.createdAt', 'DESC');

    // Thêm bộ lọc theo status
    if (filters?.status) {
      queryBuilder.andWhere('leaveRequest.status = :status', {
        status: filters.status,
      });
    }

    // Thêm bộ lọc theo khoảng thời gian
    if (filters?.startDate && filters?.endDate) {
      // Include leave requests that overlap with the date range
      // A leave request overlaps if: startDate <= filterEndDate AND endDate >= filterStartDate
      queryBuilder.andWhere('leaveRequest.startDate <= :endDate', {
        endDate: filters.endDate,
      });
      queryBuilder.andWhere('leaveRequest.endDate >= :startDate', {
        startDate: filters.startDate,
      });
    }

    // Lấy dữ liệu và tổng số lượng
    const [data, total] = await queryBuilder
      .skip((options.page - 1) * options.limit)
      .take(options.limit)
      .getManyAndCount();

    // Load approvers từ approverEmployeeIds
    await this.loadApproversForList(data);

    // Trả về dữ liệu và thông tin phân trang
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

  async update(id: number, dto: UpdateLeaveRequestDto) {
    const found = await this.findOne(id);

    const next: Partial<LeaveRequest> = { ...found, ...dto } as any;

    // Tính lại totalDays nếu startDate, endDate, hoặc leaveSession thay đổi
    const newStartDate = dto.startDate ? new Date(dto.startDate) : found.startDate;
    const newEndDate = dto.endDate ? new Date(dto.endDate) : found.endDate;
    const newLeaveSession = dto.leaveSession || found.leaveSession;
    
    if (dto.startDate || dto.endDate || dto.leaveSession) {
      next.totalDays = this.calculateTotalDays(
        newStartDate,
        newEndDate,
        newLeaveSession
      );
    }
    console.log('dto.leaveTypeId', dto.leaveTypeId);
    // Cập nhật loại nghỉ theo leaveTypeId mới (nếu gửi lên)
    if (dto.leaveTypeId !== undefined) {
      const leaveTypeIdNum = Number(dto.leaveTypeId);
      if (!Number.isFinite(leaveTypeIdNum) || leaveTypeIdNum <= 0) {
        throwBadRequestError('leaveTypeId không hợp lệ');
      }

      const leaveTypeEntity = await this.leaveTypeService.findOne(leaveTypeIdNum);
      if (!leaveTypeEntity) {
        throwBadRequestError('Loại nghỉ phép không tồn tại');
      }

      // Lưu cả ID (bigint thường trả về string) và relation để đảm bảo update
      next.leaveTypeId = leaveTypeIdNum as any;
      next.leaveTypeRef = { id: leaveTypeIdNum } as any;
      next.leaveType = leaveTypeEntity.isPaid ? 'paid' : 'unpaid';
    }
    // Chú ý: decidedAt được đặt bởi trigger cho trạng thái approved/rejected/cancelled
    // Nhưng chúng tôi vẫn giữ nó cho tương thích ngược nếu trigger bị vô hiệu hóa
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

    // Validate: HR chỉ có thể xác nhận đơn đã được duyệt
    if (dto.status === 'hr_confirmed' && found.status !== 'approved') {
      throwBadRequestError('Chỉ có thể xác nhận đơn đã được duyệt');
    }

    // Truy vấn nhân viên chỉ để gửi notification (trigger xử lý cập nhật số ngày phép)
    let employee: Employee | null = null;
    if (
      found.status === 'pending' &&
      dto.status &&
      ['approved', 'rejected'].includes(dto.status)
    ) {
      employee = await this.employeeRepository.findOne({
        where: { id: found.employeeId },
        relations: ['user'],
      });

      if (!employee) {
        this.warn(`Employee not found: ${found.employeeId}`);
      }
    }


    const updatedLeaveRequest = await this.leaveRepository.save(
      this.leaveRepository.create(next)
    );

    // Gửi notification cho nhân viên khi đơn được duyệt/từ chối
    if (
      dto.status &&
      ['approved', 'rejected'].includes(dto.status) &&
      found.status === 'pending' &&
      employee
    ) {
      try {
        if (!employee.userId) {
          this.warn(`Employee has no userId: ${found.employeeId}`);
          return updatedLeaveRequest;
        }

        const statusText =
          dto.status === 'approved' ? 'đã được duyệt' : 'đã bị từ chối';
        const leaveTypeText =
          found.leaveType === 'paid' ? 'có lương' : 'không lương';
        const notificationType =
          dto.status === 'approved'
            ? NOTIFICATION_TYPE.LEAVE_REQUEST_APPROVED
            : NOTIFICATION_TYPE.LEAVE_REQUEST_REJECTED;

        // Convert to Date objects if they are strings
        const startDate = new Date(found.startDate);
        const endDate = new Date(found.endDate);

        await this.notificationService.sendNotificationToUser(
          employee.userId,
          `Đơn nghỉ phép ${statusText}`,
          `Đơn nghỉ ${leaveTypeText} của bạn từ ${startDate.toLocaleDateString(
            'vi-VN'
          )} đến ${endDate.toLocaleDateString('vi-VN')} ${statusText}`,
          notificationType,
          found.id,
          {
            status: dto.status,
            leaveType: found.leaveType,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            totalDays: found.totalDays,
            decisionNote: dto.decisionNote,
          }
        );

        // Gửi notification cho HR khi đơn được duyệt
        if (dto.status === 'approved') {
          await this.sendNotificationToHR(
            found.factoryId,
            employee.user?.fullName || `NV #${found.employeeId}`,
            startDate,
            endDate,
            found.totalDays || 0,
            found.id
          );
        }
      } catch (error) {
        this.error('Error sending notification:', error);
        // Không throw error để không ảnh hưởng đến việc update leave request
      }
    }

    // Load lại đầy đủ relations để trả về cho client
    return this.findOne(updatedLeaveRequest.id);
  }

  async softDelete(id: number) {
    await this.findOne(id);
    return this.leaveRepository.softDelete(id);
  }

  private calculateTotalDays(
    start: Date,
    end: Date,
    leaveSession: 'full_day' | 'morning' | 'afternoon'
  ): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    const startTime = new Date(start).setHours(0, 0, 0, 0);
    const endTime = new Date(end).setHours(0, 0, 0, 0);
    const diffMs = endTime - startTime;
    const days = Math.floor(diffMs / msPerDay) + 1; // tính cả 2 đầu mút

    // Nếu nghỉ 1 ngày và chọn buổi sáng/chiều => 0.5 ngày
    if (
      days === 1 &&
      (leaveSession === 'morning' || leaveSession === 'afternoon')
    ) {
      return 0.5;
    }

    return days;
  }

  /**
   * Gửi notification cho tất cả HR trong factory khi đơn nghỉ phép được duyệt
   */
  private async sendNotificationToHR(
    factoryId: number,
    employeeName: string,
    startDate: Date,
    endDate: Date,
    totalDays: number,
    leaveRequestId: number
  ): Promise<void> {
    try {
      // Tìm tất cả employees có quyền receive_leave_approved_notification trong factory
      // Sử dụng query builder vì ArrayContains không hoạt động đúng với text[] trong PostgreSQL
      let hrEmployees = await this.employeeRepository
        .createQueryBuilder('employee')
        .leftJoinAndSelect('employee.user', 'user')
        .leftJoinAndSelect('employee.roleGroups', 'roleGroups')
        .where('employee.factoryId = :factoryId', { factoryId })
        .getMany();
      
      // Filter by merged permissions (from roleGroups + permissions cũ)
      hrEmployees = hrEmployees.filter(emp => 
        hasEmployeePermission(emp, EMPLOYEE_PERMISSION.RECEIVE_LEAVE_APPROVED_NOTIFICATION)
      );

      if (hrEmployees.length === 0) {
        this.debug(`No HR employees with permission in factory ${factoryId}`);
        return;
      }

      const title = 'Có đơn nghỉ phép của nhân viên đã được duyệt';
      const body = `${employeeName} đã được duyệt nghỉ phép từ ${startDate.toLocaleDateString(
        'vi-VN'
      )} đến ${endDate.toLocaleDateString('vi-VN')} (${totalDays} ngày)`;

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
        NOTIFICATION_TYPE.LEAVE_REQUEST_APPROVED,
        leaveRequestId,
        {
          employeeName,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          totalDays,
          isHRNotification: true,
        }
      );

      this.log(
        `Sent leave approval notification to ${hrEmployees.length} HR employee(s)`
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
    const leaveRequest = await this.leaveRepository.findOne({
      where: { id },
      relations: ['employee', 'employee.user'],
    });

    if (!leaveRequest) {
      throwNotFoundError('Đơn nghỉ phép không tồn tại');
    }

    // Chỉ gửi reminder cho đơn đang pending
    if (leaveRequest.status !== 'pending') {
      throwBadRequestError('Chỉ có thể gửi nhắc duyệt cho đơn đang chờ duyệt');
    }

    if (!leaveRequest.approverEmployeeIds || leaveRequest.approverEmployeeIds.length === 0) {
      throwBadRequestError('Đơn này không có người duyệt');
    }

    try {
      const employee = leaveRequest.employee;
      const employeeName = employee?.user?.fullName || 'Nhân viên';

      const approvers = await this.employeeRepository.find({
        where: leaveRequest.approverEmployeeIds.map((id) => ({ id })),
        relations: ['user'],
      });

      const approverUserIds = approvers
        .filter((a) => a?.userId)
        .map((a) => a.userId);

      if (approverUserIds.length > 0) {
        const startDate = new Date(leaveRequest.startDate);
        const endDate = new Date(leaveRequest.endDate);
        const leaveTypeText = leaveRequest.leaveType === 'paid' ? 'có lương' : 'không lương';

        await this.notificationService.sendNotificationToMultipleUsers(
          approverUserIds,
          'Nhắc duyệt đơn nghỉ phép',
          `${employeeName} đã tạo đơn nghỉ ${leaveTypeText} từ ${startDate.toLocaleDateString(
            'vi-VN'
          )} đến ${endDate.toLocaleDateString('vi-VN')} - Vui lòng xem xét duyệt`,
          NOTIFICATION_TYPE.LEAVE_REQUEST_REMINDER,
          leaveRequest.id,
          {
            employeeName,
            leaveType: leaveRequest.leaveType,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            totalDays: leaveRequest.totalDays,
          }
        );
      }
    } catch (error) {
      this.error('Error sending reminder notification:', error);
      throw error;
    }
  }

  /**
   * Export leave requests to XLSX
   * Format: 
   * - Các cột là từng ngày trong tháng
   * - Mỗi ngày hiển thị: số ngày nghỉ (0.5 cho nửa ngày, 1 cho cả ngày)
   * - Mỗi nhân viên có các hàng con tương ứng với số loại nghỉ phép
   * - 5 cột tổng hợp ở cuối (merge = số lượng hàng con)
   */
  async generateLeaveRequestXLSX(
    factoryId: number,
    year: number,
    month: number
  ): Promise<ArrayBuffer> {
    try {
      const factory = await this.factoryRepository.findOne({
        where: { id: factoryId },
      });

      // Lấy tất cả leave types của factory (active)
      const leaveTypes = await this.leaveTypeRepository.find({
        where: {
          factoryId,
          isActive: true,
        },
        order: { sortOrder: 'ASC', code: 'ASC' },
      });

      // Tính số ngày trong tháng
      const daysInMonth = new Date(year, month, 0).getDate();

      // Tính ngày đầu và cuối tháng
      const startDate = new Date(year, month - 1, 1);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(year, month, 0);
      endDate.setHours(23, 59, 59, 999);

      // Lấy tất cả leave requests đã approved có overlap với tháng
      // Một request overlap nếu: startDate <= endDate của tháng AND endDate >= startDate của tháng
      const leaveRequests = await this.leaveRepository
        .createQueryBuilder('leaveRequest')
        .where('leaveRequest.factoryId = :factoryId', { factoryId })
        .andWhere('leaveRequest.status = :status', { status: 'approved' })
        .andWhere('leaveRequest.startDate <= :monthEndDate', { monthEndDate: endDate })
        .andWhere('leaveRequest.endDate >= :monthStartDate', { monthStartDate: startDate })
        .leftJoinAndSelect('leaveRequest.employee', 'employee')
        .leftJoinAndSelect('employee.user', 'user')
        .leftJoinAndSelect('employee.position', 'position')
        .leftJoinAndSelect('employee.department', 'department')
        .leftJoinAndSelect('leaveRequest.leaveTypeRef', 'leaveTypeRef')
        .orderBy('leaveRequest.startDate', 'ASC')
        .addOrderBy('leaveRequest.employeeId', 'ASC')
        .getMany();

      // Group requests by employee and date
      const requestsByEmployeeAndDate = new Map<string, LeaveRequest[]>();
      for (const request of leaveRequests) {
        // Tính các ngày trong khoảng startDate đến endDate
        const requestStartDate = request.startDate instanceof Date 
          ? request.startDate 
          : new Date(request.startDate);
        const requestEndDate = request.endDate instanceof Date 
          ? request.endDate 
          : new Date(request.endDate);

        // Chỉ lấy các ngày trong tháng (từ startDate của tháng đến endDate của tháng)
        const effectiveStartDate = requestStartDate > startDate ? requestStartDate : startDate;
        const effectiveEndDate = requestEndDate < endDate ? requestEndDate : endDate;

        // Lặp qua từng ngày trong khoảng nghỉ (chỉ trong tháng)
        const currentDate = new Date(effectiveStartDate);
        while (currentDate <= effectiveEndDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const key = `${request.employeeId}_${dateStr}`;
          if (!requestsByEmployeeAndDate.has(key)) {
            requestsByEmployeeAndDate.set(key, []);
          }
          requestsByEmployeeAndDate.get(key)!.push(request);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      // Tạo workbook
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Nghỉ phép');

      const totalTypes = Math.min(5, leaveTypes.length);

      // Tính số cột
      const baseCols = 5; // STT, Tên, Vị trí, Phòng ban, Loại nghỉ phép
      const totalCols = baseCols + daysInMonth + totalTypes; // + totalTypes cột tổng hợp

      // Factory name at row 1
      sheet.addRow([factory?.name ?? 'Nhà máy']);
      sheet.mergeCells(1, 1, 1, totalCols);
      const factoryNameCell = sheet.getCell(1, 1);
      factoryNameCell.font = { bold: true, size: 16 };
      factoryNameCell.alignment = { horizontal: 'left' };

      // Title at row 2
      sheet.addRow([`Bảng tổng hợp nghỉ phép tháng ${month}/${year}`]);
      sheet.mergeCells(2, 1, 2, totalCols);
      const titleCell = sheet.getCell(2, 1);
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { horizontal: 'center' };

      // Header rows (row 3 and row 4)
      const headerRow1 = sheet.addRow([
        'STT',
        'Tên nhân viên',
        'Vị trí',
        'Phòng ban',
        'Loại nghỉ phép',
        ...Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`), // Các ngày trong tháng
        ...leaveTypes.slice(0, totalTypes).map(lt => lt.name), // 5 cột tổng hợp (tên loại nghỉ phép)
      ]);
      const headerRow2 = sheet.addRow([
        '',
        '',
        '',
        '',
        '',
        ...Array.from({ length: daysInMonth }, (_, i) =>
          this.getDayOfWeek(new Date(year, month - 1, i + 1).getDay())
        ), // Thứ trong tuần
        ...Array.from({ length: totalTypes }, () => ''), // Cột tổng hợp
      ]);

      // Merge header
      sheet.mergeCells(3, 1, 4, 1); // STT
      sheet.mergeCells(3, 2, 4, 2); // Tên nhân viên
      sheet.mergeCells(3, 3, 4, 3); // Vị trí
      sheet.mergeCells(3, 4, 4, 4); // Phòng ban
      sheet.mergeCells(3, 5, 4, 5); // Loại nghỉ phép
      // Merge 5 cột tổng hợp
      for (let i = 0; i < totalTypes; i++) {
        sheet.mergeCells(3, baseCols + daysInMonth + 1 + i, 4, baseCols + daysInMonth + 1 + i);
      }

      // Style headers
      [headerRow1, headerRow2].forEach(r => {
        r.eachCell((cell, colNumber) => {
          cell.font = { bold: true };
          this.setThinBorder(cell);
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE6F0FF' },
          };
          
          // Thêm wrapText cho các cột tổng hợp (Type columns)
          if (colNumber > baseCols + daysInMonth && colNumber <= baseCols + daysInMonth + totalTypes) {
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          } else {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
        });
      });
      
      // Tăng chiều cao hàng header để text có thể wrap
      headerRow1.height = 30;
      headerRow2.height = 30;

      // Column widths
      sheet.getColumn(1).width = 6; // STT
      sheet.getColumn(2).width = 24; // Tên
      sheet.getColumn(3).width = 16; // Vị trí
      sheet.getColumn(4).width = 16; // Phòng ban
      sheet.getColumn(5).width = 16; // Loại nghỉ phép
      for (let col = baseCols + 1; col <= baseCols + daysInMonth; col++) {
        sheet.getColumn(col).width = 6; // Day columns
      }
      for (let i = 0; i < totalTypes; i++) {
        sheet.getColumn(baseCols + daysInMonth + 1 + i).width = 8; // Tổng columns
      }

      // Get unique employees
      const employeeMap = new Map<number, any>();
      for (const request of leaveRequests) {
        if (!employeeMap.has(request.employeeId)) {
          employeeMap.set(request.employeeId, request.employee);
        }
      }

      const employees = Array.from(employeeMap.values())
        .filter(Boolean)
        .sort((a, b) => {
          const deptA = (a as any).department?.name || '';
          const deptB = (b as any).department?.name || '';
          if (deptA !== deptB) return deptA.localeCompare(deptB);
          const nameA = (a as any).user?.fullName || '';
          const nameB = (b as any).user?.fullName || '';
          return nameA.localeCompare(nameB);
        });

      // Group by department
      const employeesByDepartment = employees.reduce(
        (groups: Record<string, typeof employees>, emp) => {
          const dept = (emp as any).department?.name || 'Chưa xác định';
          if (!groups[dept]) groups[dept] = [];
          groups[dept].push(emp);
          return groups;
        },
        {}
      );

      const sortedDepartments = Object.keys(employeesByDepartment).sort();

      let index = 1;
      for (const deptName of sortedDepartments) {
        // Department header row
        const deptRow = sheet.addRow([deptName]);
        sheet.mergeCells(deptRow.number, 1, deptRow.number, totalCols);
        const deptCell = sheet.getCell(deptRow.number, 1);
        deptCell.font = { bold: true };
        deptCell.alignment = { horizontal: 'left' };
        deptCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD8EAD3' },
        };
        this.setThinBorder(deptCell);

        for (const employee of employeesByDepartment[deptName]) {
          const employeeId = (employee as any).id;

          // Số hàng con = số loại nghỉ phép của nhà máy
          const numSubRows = totalTypes;

          // Tạo các hàng con (mỗi hàng = 1 loại nghỉ phép)
          const startRow = sheet.rowCount + 1;
          for (let subRowIdx = 0; subRowIdx < numSubRows; subRowIdx++) {
            const leaveType = leaveTypes[subRowIdx];
            const typeId = Number(leaveType.id);

            const rowValues: (string | number)[] = [
              subRowIdx === 0 ? index : '', // STT chỉ ở hàng đầu
              subRowIdx === 0 ? (employee as any).user?.fullName || '' : '', // Tên chỉ ở hàng đầu
              subRowIdx === 0 ? (employee as any).position?.name || 'Chưa xác định' : '', // Vị trí chỉ ở hàng đầu
              subRowIdx === 0 ? (employee as any).department?.name || 'Chưa xác định' : '', // Phòng ban chỉ ở hàng đầu
              leaveType.name, // Tên loại nghỉ phép (hiển thị theo hàng)
            ];

            // Dữ liệu cho từng ngày trong tháng
            const dayTotals: number[] = [];
            for (let day = 1; day <= daysInMonth; day++) {
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const key = `${employeeId}_${dateStr}`;
              const dayRequests = requestsByEmployeeAndDate.get(key) || [];

              // Tính tổng số ngày nghỉ cho loại nghỉ phép này trong ngày
              let dayTotal = 0;
              for (const request of dayRequests) {
                // Kiểm tra xem request có thuộc loại nghỉ phép này không
                const requestTypeId = request.leaveTypeId ? Number(request.leaveTypeId) : null;
                if (requestTypeId === typeId) {
                  // Nếu nghỉ cả ngày
                  if (request.leaveSession === 'full_day') {
                    dayTotal += 1;
                  } else if (request.leaveSession === 'morning' || request.leaveSession === 'afternoon') {
                    // Nếu nghỉ nửa ngày
                    dayTotal += 0.5;
                  }
                }
              }

              dayTotals.push(dayTotal);

              // Hiển thị số ngày nghỉ
              if (dayTotal > 0) {
                rowValues.push(dayTotal);
              } else {
                rowValues.push('-');
              }
            }

            // 5 cột tổng hợp (để trống, sẽ merge và tính sau)
            rowValues.push('', '', '', '', '');

            const row = sheet.addRow(rowValues);

            // Style row
            for (let c = 1; c <= totalCols; c++) {
              const cell = row.getCell(c);
              this.setThinBorder(cell);

              if (c === 1) {
                // STT column
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
              } else if (c === 5) {
                // Loại nghỉ phép column
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
              } else if (c >= baseCols + 1 && c <= baseCols + daysInMonth) {
                // Day columns
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                if (cell.value && cell.value !== '' && cell.value !== '-' && typeof cell.value === 'number') {
                  cell.numFmt = '0.0';
                }
              } else if (c > baseCols + daysInMonth) {
                // Tổng columns - thêm màu nền
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FFFFF4E6' }, // Màu vàng nhạt
                };
              } else {
                // Base columns (Tên, Vị trí, Phòng ban)
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
              }
            }
          }

          // Merge các cột base (STT, Tên, Vị trí, Phòng ban) và các cột tổng hợp
          const endRow = sheet.rowCount;
          if (endRow >= startRow) {
            // Merge STT
            sheet.mergeCells(startRow, 1, endRow, 1);
            // Merge Tên
            sheet.mergeCells(startRow, 2, endRow, 2);
            // Merge Vị trí
            sheet.mergeCells(startRow, 3, endRow, 3);
            // Merge Phòng ban
            sheet.mergeCells(startRow, 4, endRow, 4);
            // Không merge cột Loại nghỉ phép vì mỗi hàng con có tên loại nghỉ phép khác nhau

            // Tính tổng cho từng loại nghỉ phép
            const totalsByType: number[] = [];
            for (let subRowIdx = 0; subRowIdx < numSubRows; subRowIdx++) {
              const leaveType = leaveTypes[subRowIdx];
              const typeId = Number(leaveType.id);
              let typeTotal = 0;

              for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const key = `${employeeId}_${dateStr}`;
                const dayRequests = requestsByEmployeeAndDate.get(key) || [];

                for (const request of dayRequests) {
                  const requestTypeId = request.leaveTypeId ? Number(request.leaveTypeId) : null;
                  if (requestTypeId === typeId) {
                    if (request.leaveSession === 'full_day') {
                      typeTotal += 1;
                    } else if (request.leaveSession === 'morning' || request.leaveSession === 'afternoon') {
                      typeTotal += 0.5;
                    }
                  }
                }
              }
              totalsByType.push(typeTotal);
            }

            // Merge totalTypes cột tổng hợp và điền giá trị
            for (let i = 0; i < totalTypes; i++) {
              const col = baseCols + daysInMonth + 1 + i;
              sheet.mergeCells(startRow, col, endRow, col);
              
              const totalCell = sheet.getCell(startRow, col);
              if (i < totalsByType.length) {
                // Hiển thị tổng của loại nghỉ phép tương ứng
                const total = totalsByType[i];
                if (total > 0) {
                  totalCell.value = total;
                  totalCell.numFmt = '0.0';
                } else {
                  totalCell.value = '-';
                }
              } else {
                // Nếu không đủ totalTypes loại nghỉ phép, hiển thị '-'
                totalCell.value = '-';
              }
              totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
              // Thêm màu nền cho cell tổng hợp
              totalCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFF4E6' }, // Màu vàng nhạt
              };
            }
          }

          index++;
        }
      }

      return await workbook.xlsx.writeBuffer();
    } catch (error) {
      this.error('Error generating leave request XLSX:', error);
      throw error;
    }
  }

  private getDayOfWeek(day: number): string {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return days[day];
  }

  private setThinBorder(cell: ExcelJS.Cell) {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };
  }
}
