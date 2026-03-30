import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { GeneralRequest } from './entities/general-request.entity';
import { CreateGeneralRequestDto } from './dto/create-general-request.dto';
import { UpdateGeneralRequestDto } from './dto/update-general-request.dto';
import { Employee } from 'src/employee/entities/employee.entity';
import { NotificationService } from 'src/notification/notification.service';
import { NOTIFICATION_TYPE } from 'src/notification/constants/notification-type.constant';
import { throwNotFoundError, throwBadRequestError } from 'src/utils/error.helper';
import { IPaginationOptions, IPaginationResult } from 'src/utils/types/pagination-options.type';

@Injectable()
export class GeneralRequestService {
  private readonly context = 'GeneralRequestService';

  constructor(
    @InjectRepository(GeneralRequest)
    private readonly generalRequestRepository: Repository<GeneralRequest>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly notificationService: NotificationService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  private log(message: string) {
    this.logger.info(message, { context: this.context });
  }

  private error(message: string, trace?: any) {
    this.logger.error(message, { context: this.context, trace: trace?.stack || trace });
  }

  async create(employeeId: number, dto: CreateGeneralRequestDto): Promise<GeneralRequest> {
    const request = this.generalRequestRepository.create({
      ...dto,
      employeeId,
      status: 'pending',
    });

    const savedRequest = await this.generalRequestRepository.save(request);

    // Send notification to approver
    try {
      const requester = await this.employeeRepository.findOne({
        where: { id: employeeId },
        relations: ['user'],
      });

      const approver = await this.employeeRepository.findOne({
        where: { id: dto.approverEmployeeId },
        relations: ['user'],
      });

      if (requester && approver?.userId) {
        await this.notificationService.sendNotificationToUser(
          approver.userId,
          'Yêu cầu mới cần duyệt',
          `${requester.user?.fullName || 'Nhân viên'} đã gửi một yêu cầu mới: ${dto.title}`,
          NOTIFICATION_TYPE.GENERAL_REQUEST_CREATED,
          savedRequest.id,
          {
            title: dto.title,
            requesterName: requester.user?.fullName,
          }
        );
      }
    } catch (err) {
      this.error('Error sending notification for general request creation', err);
    }

    return this.findOne(savedRequest.id);
  }

  async findAllByEmployee(
    employeeId: number,
    options: IPaginationOptions,
  ): Promise<IPaginationResult<GeneralRequest>> {
    const [data, total] = await this.generalRequestRepository.findAndCount({
      where: { employeeId },
      relations: ['approver', 'approver.user', 'decidedBy', 'decidedBy.user'],
      order: { createdAt: 'DESC' },
      take: options.limit,
      skip: (options.page - 1) * options.limit,
    });

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

  async findAllAssignedToMe(
    employeeId: number,
    options: IPaginationOptions,
  ): Promise<IPaginationResult<GeneralRequest>> {
    const [data, total] = await this.generalRequestRepository.findAndCount({
      where: { approverEmployeeId: employeeId },
      relations: ['employee', 'employee.user', 'decidedBy', 'decidedBy.user'],
      order: { createdAt: 'DESC' },
      take: options.limit,
      skip: (options.page - 1) * options.limit,
    });

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

  async findOne(id: number): Promise<GeneralRequest> {
    const request = await this.generalRequestRepository.findOne({
      where: { id },
      relations: ['employee', 'employee.user', 'approver', 'approver.user', 'decidedBy', 'decidedBy.user'],
    });

    if (!request) {
      throwNotFoundError('Không tìm thấy yêu cầu');
    }

    return request;
  }

  async update(id: number, decidedByEmployeeId: number, dto: UpdateGeneralRequestDto): Promise<GeneralRequest> {
    const request = await this.findOne(id);

    if (dto.status && request.status !== 'pending' && dto.status !== request.status) {
      // Logic for changing status after it was already decided could be added here if needed
    }

    if (dto.status === 'approved' || dto.status === 'rejected') {
      request.decidedAt = new Date();
      request.decidedByEmployeeId = decidedByEmployeeId;
    }

    Object.assign(request, dto);
    const updatedRequest = await this.generalRequestRepository.save(request);

    // Send notification to requester
    try {
      if (dto.status === 'approved' || dto.status === 'rejected') {
        const requester = await this.employeeRepository.findOne({
          where: { id: request.employeeId },
          relations: ['user'],
        });

        if (requester?.userId) {
          const statusText = dto.status === 'approved' ? 'đã được duyệt' : 'đã bị từ chối';
          const notificationType = dto.status === 'approved' 
            ? NOTIFICATION_TYPE.GENERAL_REQUEST_APPROVED 
            : NOTIFICATION_TYPE.GENERAL_REQUEST_REJECTED;

          await this.notificationService.sendNotificationToUser(
            requester.userId,
            `Yêu cầu ${statusText}`,
            `Yêu cầu "${request.title}" của bạn ${statusText}`,
            notificationType,
            request.id,
            {
              status: dto.status,
              title: request.title,
            }
          );
        }
      }
    } catch (err) {
      this.error('Error sending notification for general request update', err);
    }

    return this.findOne(updatedRequest.id);
  }

  async remove(id: number): Promise<void> {
    const request = await this.findOne(id);
    if (request.status !== 'pending') {
      throwBadRequestError('Chỉ có thể xóa yêu cầu đang ở trạng thái chờ duyệt');
    }
    await this.generalRequestRepository.softDelete(id);
  }
}
