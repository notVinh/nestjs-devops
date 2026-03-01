import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, IsNull } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import {
  EmployeeFeedback,
  FeedbackStatus,
} from './entities/employee-feedback.entity';
import { CreateEmployeeFeedbackDto } from './dto/create-employee-feedback.dto';
import { UpdateEmployeeFeedbackDto } from './dto/update-employee-feedback.dto';
import {
  IPaginationOptions,
  IPaginationResult,
} from 'src/utils/types/pagination-options.type';
import { Employee } from 'src/employee/entities/employee.entity';
import { NotificationService } from 'src/notification/notification.service';
import { NOTIFICATION_TYPE } from 'src/notification/constants/notification-type.constant';

@Injectable()
export class EmployeeFeedbackService {
  private readonly context = 'EmployeeFeedbackService';

  constructor(
    @InjectRepository(EmployeeFeedback)
    private readonly feedbackRepository: Repository<EmployeeFeedback>,
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

  async create(
    createDto: CreateEmployeeFeedbackDto,
  ): Promise<EmployeeFeedback> {
    // Map assignedEmployeeId to repliedByEmployeeId if provided
    const feedbackData: any = { ...createDto };
    if (createDto.assignedEmployeeId) {
      feedbackData.repliedByEmployeeId = createDto.assignedEmployeeId;
      delete feedbackData.assignedEmployeeId; // Remove temporary field
    }

    const feedback = await this.feedbackRepository.create(feedbackData);
    const savedFeedback = await this.feedbackRepository.save(feedback) as unknown as EmployeeFeedback;

    // Gửi notification cho người được giao xử lý feedback (nếu có)
    if (createDto.assignedEmployeeId) {
      try {
        const employee = await this.employeeRepository.findOne({
          where: { id: createDto.employeeId },
          relations: ['user'],
        });

        const assignedEmployee = await this.employeeRepository.findOne({
          where: { id: createDto.assignedEmployeeId },
          relations: ['user'],
        });

        if (assignedEmployee?.userId && employee?.user?.fullName) {
          const priorityText =
            createDto.priority === 'urgent' ? 'KHẨN CẤP' :
            createDto.priority === 'high' ? 'Cao' :
            createDto.priority === 'medium' ? 'Trung bình' : 'Thấp';

          await this.notificationService.sendNotificationToUser(
            assignedEmployee.userId,
            'Góp ý mới được giao cho bạn',
            `${employee.user.fullName} đã gửi góp ý "${createDto.title}" (Mức độ: ${priorityText})`,
            NOTIFICATION_TYPE.EMPLOYEE_FEEDBACK_CREATED,
            savedFeedback.id,
            {
              employeeName: employee.user.fullName,
              title: createDto.title,
              priority: createDto.priority || 'medium',
              content: createDto.content,
            }
          );
        }
      } catch (error) {
        this.error('Error sending notification:', error);
        // Không throw error để không ảnh hưởng đến việc tạo feedback
      }
    }

    return savedFeedback;
  }

  // Optimized: WHERE trước để filter sớm, sau đó mới JOIN
  async findAllByFactory(
    options: IPaginationOptions,
    factoryId: number,
    filters?: {
      status?: FeedbackStatus;
      priority?: string;
      unviewedOnly?: boolean;
    },
  ): Promise<IPaginationResult<EmployeeFeedback>> {
    // Tạo query builder
    const queryBuilder = this.feedbackRepository
      .createQueryBuilder('feedback')
      .where('feedback.factoryId = :factoryId', { factoryId })
      .andWhere('feedback.deletedAt IS NULL')
      .leftJoin('feedback.employee', 'employee')
      .leftJoin('employee.user', 'user')
      .leftJoin('employee.department', 'department')
      .leftJoin('feedback.repliedByEmployee', 'repliedByEmployee')
      .leftJoin('repliedByEmployee.user', 'repliedByUser')
      .select([
        'feedback.id',
        'feedback.content',
        'feedback.priority',
        'feedback.status',
        'feedback.isAnonymous',
        'feedback.viewedAt',
        'feedback.replyContent',
        'feedback.repliedAt',
        'feedback.createdAt',
        // Employee info (có thể ẩn nếu anonymous)
        'employee.id',
        'user.id',
        'user.fullName',
        'user.email',
        'user.phone',
        // Department
        'department.id',
        'department.name',
        // Replied by info
        'repliedByEmployee.id',
        'repliedByUser.id',
        'repliedByUser.fullName',
      ])
      .orderBy('feedback.createdAt', 'DESC');

    // Thêm bộ lọc theo status
    if (filters?.status) {
      queryBuilder.andWhere('feedback.status = :status', {
        status: filters.status,
      });
    }

    // Thêm bộ lọc theo priority
    if (filters?.priority) {
      queryBuilder.andWhere('feedback.priority = :priority', {
        priority: filters.priority,
      });
    }

    // Thêm bộ lọc chỉ lấy chưa xem
    if (filters?.unviewedOnly) {
      queryBuilder.andWhere('feedback.viewedAt IS NULL');
    }

    // Lấy dữ liệu và tổng số lượng
    const [data, total] = await queryBuilder
      .skip((options.page - 1) * options.limit)
      .take(options.limit)
      .getManyAndCount();

    // Mask anonymous feedback
    const maskedData = data.map((feedback) => {
      if (feedback.isAnonymous && feedback.employee?.user) {
        feedback.employee.user.fullName = 'Ẩn danh';
        feedback.employee.user.email = null;
        feedback.employee.user.phone = null;
      }
      return feedback;
    });

    // Trả về dữ liệu và thông tin phân trang
    return {
      data: maskedData,
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

  async findOne(id: number): Promise<EmployeeFeedback> {
    const feedback = await this.feedbackRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: [
        'employee',
        'employee.user',
        'employee.department',
        'repliedByEmployee',
        'repliedByEmployee.user',
      ],
    });

    if (!feedback) {
      throw new NotFoundException('Không tìm thấy góp ý');
    }

    return feedback;
  }

  // Lấy danh sách góp ý được giao cho mình phản hồi
  async findAssignedToMe(
    options: IPaginationOptions,
    employeeId: number,
    filters?: {
      status?: FeedbackStatus;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<IPaginationResult<EmployeeFeedback>> {
    // Tạo query builder
    const queryBuilder = this.feedbackRepository
      .createQueryBuilder('feedback')
      .where('feedback.repliedByEmployeeId = :employeeId', { employeeId })
      .andWhere('feedback.deletedAt IS NULL')
      .leftJoin('feedback.employee', 'employee')
      .leftJoin('employee.user', 'user')
      .leftJoin('employee.department', 'department')
      .select([
        'feedback.id',
        'feedback.title',
        'feedback.content',
        'feedback.priority',
        'feedback.status',
        'feedback.isAnonymous',
        'feedback.viewedAt',
        'feedback.replyContent',
        'feedback.repliedAt',
        'feedback.createdAt',
        // Employee info (người góp ý)
        'employee.id',
        'user.id',
        'user.fullName',
        'user.email',
        'user.phone',
        // Department
        'department.id',
        'department.name',
      ])
      .orderBy('feedback.createdAt', 'DESC');

    // Thêm bộ lọc theo status
    if (filters?.status) {
      queryBuilder.andWhere('feedback.status = :status', {
        status: filters.status,
      });
    }

    // Thêm bộ lọc theo khoảng thời gian
    if (filters?.startDate && filters?.endDate) {
      queryBuilder.andWhere('feedback.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
      queryBuilder.andWhere('feedback.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    // Lấy dữ liệu và tổng số lượng
    const [data, total] = await queryBuilder
      .skip((options.page - 1) * options.limit)
      .take(options.limit)
      .getManyAndCount();

    // Mask anonymous feedback
    const maskedData = data.map((feedback) => {
      if (feedback.isAnonymous && feedback.employee?.user) {
        feedback.employee.user.fullName = 'Ẩn danh';
        feedback.employee.user.email = null;
        feedback.employee.user.phone = null;
      }
      return feedback;
    });

    // Trả về dữ liệu và thông tin phân trang
    return {
      data: maskedData,
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
  async findByEmployee(
    options: IPaginationOptions,
    employeeId: number,
    filters?: {
      status?: FeedbackStatus;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<IPaginationResult<EmployeeFeedback>> {
    // Tạo query builder
    const queryBuilder = this.feedbackRepository
      .createQueryBuilder('feedback')
      .where('feedback.employeeId = :employeeId', { employeeId })
      .andWhere('feedback.deletedAt IS NULL')
      .leftJoin('feedback.repliedByEmployee', 'repliedByEmployee')
      .leftJoin('repliedByEmployee.user', 'repliedByUser')
      .select([
        'feedback.id',
        'feedback.title',
        'feedback.content',
        'feedback.priority',
        'feedback.status',
        'feedback.isAnonymous',
        'feedback.viewedAt',
        'feedback.replyContent',
        'feedback.repliedAt',
        'feedback.createdAt',
        // Replied by info
        'repliedByEmployee.id',
        'repliedByUser.id',
        'repliedByUser.fullName',
      ])
      .orderBy('feedback.createdAt', 'DESC');

    // Thêm bộ lọc theo status
    if (filters?.status) {
      queryBuilder.andWhere('feedback.status = :status', {
        status: filters.status,
      });
    }

    // Thêm bộ lọc theo khoảng thời gian
    if (filters?.startDate && filters?.endDate) {
      queryBuilder.andWhere('feedback.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
      queryBuilder.andWhere('feedback.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    // Lấy dữ liệu và tổng số lượng
    const [data, total] = await queryBuilder
      .skip((options.page - 1) * options.limit)
      .take(options.limit)
      .getManyAndCount();

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

  async update(
    id: number,
    updateDto: UpdateEmployeeFeedbackDto
  ): Promise<EmployeeFeedback> {
    const feedback = await this.findOne(id);

    // Check if this is a new reply (status changing to REPLIED)
    const isNewReply =
      updateDto.replyContent &&
      updateDto.repliedByEmployeeId &&
      feedback.status !== FeedbackStatus.REPLIED;

    // Check if reassigned to different employee (without reply)
    const isReassigned =
      updateDto.repliedByEmployeeId &&
      updateDto.repliedByEmployeeId !== feedback.repliedByEmployeeId &&
      !updateDto.replyContent; // Reassign mà không phải reply

    // If replying to feedback
    if (updateDto.replyContent && updateDto.repliedByEmployeeId) {
      updateDto['repliedAt'] = new Date();
      if (!updateDto.status) {
        updateDto.status = FeedbackStatus.REPLIED;
      }
    }

    Object.assign(feedback, updateDto);

    const updatedFeedback = await this.feedbackRepository.save(feedback);

    // Query employee (người tạo feedback) 1 lần cho cả reply và reassign
    let employee: Employee | null = null;
    if (isNewReply || isReassigned) {
      employee = await this.employeeRepository.findOne({
        where: { id: feedback.employeeId },
        relations: ['user'],
      });

      if (!employee) {
        this.warn(`Employee not found: ${feedback.employeeId}`);
      }
    }

    // Gửi notification cho nhân viên khi feedback được phản hồi
    if (isNewReply && employee) {
      try {
        if (!employee.userId) {
          this.warn(`Employee has no userId: ${feedback.employeeId}`);
        } else {
          // Lấy thông tin người phản hồi
          const repliedByEmployee = await this.employeeRepository.findOne({
            where: { id: updateDto.repliedByEmployeeId },
            relations: ['user'],
          });

          const repliedByName = repliedByEmployee?.user?.fullName || 'Quản lý';

          await this.notificationService.sendNotificationToUser(
            employee.userId,
            'Góp ý của bạn đã được phản hồi',
            `${repliedByName} đã phản hồi góp ý của bạn`,
            NOTIFICATION_TYPE.EMPLOYEE_FEEDBACK_REPLIED,
            feedback.id,
            {
              repliedByName,
              replyContent: updateDto.replyContent,
              originalContent: feedback.content,
            }
          );
        }
      } catch (error) {
        this.error('Error sending reply notification:', error);
      }
    }

    // Gửi notification cho người mới được assign (khi reassign mà không phải reply)
    if (isReassigned) {
      try {
        const newAssignedEmployee = await this.employeeRepository.findOne({
          where: { id: updateDto.repliedByEmployeeId },
          relations: ['user'],
        });

        if (!newAssignedEmployee) {
          this.warn(`New assigned employee not found: ${updateDto.repliedByEmployeeId}`);
        } else if (!newAssignedEmployee.userId) {
          this.warn(`New assigned employee has no userId: ${updateDto.repliedByEmployeeId}`);
        } else {
          const employeeName = employee?.user?.fullName || 'Nhân viên';
          const priorityText =
            feedback.priority === 'urgent' ? 'KHẨN CẤP' :
            feedback.priority === 'high' ? 'Cao' :
            feedback.priority === 'medium' ? 'Trung bình' : 'Thấp';

          await this.notificationService.sendNotificationToUser(
            newAssignedEmployee.userId,
            'Góp ý được giao cho bạn',
            `${employeeName} đã gửi góp ý "${feedback.title}" (Mức độ: ${priorityText})`,
            NOTIFICATION_TYPE.EMPLOYEE_FEEDBACK_CREATED,
            feedback.id,
            {
              employeeName,
              title: feedback.title,
              priority: feedback.priority,
              content: feedback.content,
            }
          );
        }
      } catch (error) {
        this.error('Error sending reassign notification:', error);
      }
    }

    return updatedFeedback;
  }

  async markAsViewed(id: number): Promise<EmployeeFeedback> {
    const feedback = await this.findOne(id);
    feedback.viewedAt = new Date();

    return await this.feedbackRepository.save(feedback);
  }

  async softDelete(id: number): Promise<void> {
    await this.feedbackRepository.softDelete(id);
  }
}
