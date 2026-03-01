import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import ExcelJS from 'exceljs';
import { SupportRequest } from './entities/support-request.entity';
import { SupportRequestItem } from './entities/support-request-item.entity';
import { SupportType } from 'src/support-type/entities/support-type.entity';
import { Employee } from 'src/employee/entities/employee.entity';
import { Factory } from 'src/factory/entities/factory.entity';
import { CreateSupportRequestDto } from './dto/create-support-request.dto';
import { UpdateSupportRequestDto } from './dto/update-support-request.dto';
import { PaginationHelper } from 'src/utils/pagination.helper';
import {
  IPaginationOptions,
  IPaginationResult,
} from 'src/utils/types/pagination-options.type';
import { NotificationService } from 'src/notification/notification.service';
import { NOTIFICATION_TYPE } from 'src/notification/constants/notification-type.constant';

@Injectable()
export class SupportRequestService {
  private readonly context = 'SupportRequestService';

  constructor(
    @InjectRepository(SupportRequest)
    private readonly supportRequestRepository: Repository<SupportRequest>,
    @InjectRepository(SupportRequestItem)
    private readonly supportRequestItemRepository: Repository<SupportRequestItem>,
    @InjectRepository(SupportType)
    private readonly supportTypeRepository: Repository<SupportType>,
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

  private error(message: string, trace?: any) {
    this.logger.error(message, {
      context: this.context,
      trace: trace?.stack || trace,
    });
  }

  // Nhân viên tạo đơn yêu cầu hỗ trợ
  async create(
    employeeId: number,
    dto: CreateSupportRequestDto
  ): Promise<SupportRequest> {
    // Kiểm tra đã có đơn pending trong ngày chưa
    // Nếu có đơn pending, yêu cầu sửa đơn cũ
    const existingPendingRequest = await this.supportRequestRepository.findOne({
      where: {
        employeeId,
        requestDate: new Date(dto.requestDate),
        status: 'pending',
      },
    });

    if (existingPendingRequest) {
      throw new ConflictException(
        'Bạn đã có đơn yêu cầu hỗ trợ đang chờ duyệt trong ngày này. Vui lòng sửa đơn đã có.'
      );
    }

    // Nếu có đơn approved trong ngày và không có parentSupportRequestId, tự động set làm đơn bổ sung
    let parentSupportRequestId = dto.parentSupportRequestId;
    if (!parentSupportRequestId) {
      const existingApprovedRequest =
        await this.supportRequestRepository.findOne({
          where: {
            employeeId,
            requestDate: new Date(dto.requestDate),
            status: 'approved',
          },
        });

      if (existingApprovedRequest) {
        parentSupportRequestId = existingApprovedRequest.id;
      }
    }

    // Validate các loại hỗ trợ
    const supportTypeIds = dto.items.map(item => Number(item.supportTypeId));
    const supportTypes = await this.supportTypeRepository.find({
      where: {
        id: In(supportTypeIds),
        factoryId: dto.factoryId,
        isActive: true,
      },
    });

    if (supportTypes.length !== supportTypeIds.length) {
      throw new BadRequestException('Một số loại hỗ trợ không hợp lệ');
    }

    // Validate ảnh cho các loại yêu cầu ảnh
    for (const item of dto.items) {
      const supportType = supportTypes.find(
        st => Number(st.id) === Number(item.supportTypeId)
      );
      if (
        supportType?.requirePhoto &&
        (!item.photoUrls || item.photoUrls.length === 0)
      ) {
        throw new BadRequestException(
          `Loại hỗ trợ "${supportType.name}" yêu cầu ảnh chứng minh`
        );
      }
      if (
        supportType?.requireQuantity &&
        (!item.quantity || item.quantity <= 0)
      ) {
        throw new BadRequestException(
          `Loại hỗ trợ "${supportType.name}" yêu cầu nhập số lượng`
        );
      }
    }

    // Tạo đơn
    const supportRequest = this.supportRequestRepository.create({
      factoryId: dto.factoryId,
      employeeId,
      requestDate: new Date(dto.requestDate),
      status: 'pending',
      approverEmployeeIds: dto.approverEmployeeIds,
      note: dto.note,
      parentSupportRequestId: parentSupportRequestId || undefined,
    });

    const savedRequest = await this.supportRequestRepository.save(
      supportRequest
    );

    // Tạo items
    const items = dto.items.map(item =>
      this.supportRequestItemRepository.create({
        supportRequestId: savedRequest.id,
        supportTypeId: Number(item.supportTypeId),
        quantity: item.quantity ?? 1,
        photoUrls: item.photoUrls,
        note: item.note,
      })
    );

    await this.supportRequestItemRepository.save(items);

    // Gửi notification cho người duyệt
    await this.sendNotificationToApprovers(savedRequest, employeeId);

    return this.findOne(savedRequest.id);
  }

  // Gửi notification cho người duyệt
  private async sendNotificationToApprovers(
    request: SupportRequest,
    employeeId: number
  ): Promise<void> {
    try {
      if (
        !request.approverEmployeeIds ||
        request.approverEmployeeIds.length === 0
      ) {
        return;
      }

      const employee = await this.employeeRepository.findOne({
        where: { id: employeeId },
        relations: ['user'],
      });

      const approvers = await this.employeeRepository.find({
        where: request.approverEmployeeIds.map(id => ({ id })),
        relations: ['user'],
      });

      const employeeName = employee?.user?.fullName || 'Nhân viên';
      const approverUserIds = approvers
        .filter(a => a?.userId)
        .map(a => a.userId);

      if (approverUserIds.length > 0) {
        await this.notificationService.sendNotificationToMultipleUsers(
          approverUserIds,
          'Báo cáo hỗ trợ mới',
          `${employeeName} đã gửi báo cáo hỗ trợ ngày ${new Date(
            request.requestDate
          ).toLocaleDateString('vi-VN')}`,
          NOTIFICATION_TYPE.SUPPORT_REQUEST_CREATED,
          request.id,
          { employeeName, requestDate: request.requestDate }
        );
      }
    } catch (error) {
      this.error('Error sending notifications to approvers:', error);
    }
  }

  // Xem lịch sử đơn của mình
  async findMyRequests(
    employeeId: number,
    options: IPaginationOptions,
    startDate?: string,
    endDate?: string,
    status?: string
  ): Promise<IPaginationResult<SupportRequest>> {
    const queryBuilder = this.supportRequestRepository
      .createQueryBuilder('request')
      .where('request.employeeId = :employeeId', { employeeId })
      .leftJoinAndSelect('request.items', 'items')
      .leftJoinAndSelect('items.supportType', 'supportType')
      .leftJoinAndSelect('request.factory', 'factory')
      .orderBy('request.createdAt', 'DESC');

    if (startDate && endDate) {
      queryBuilder.andWhere(
        'request.requestDate BETWEEN :startDate AND :endDate',
        {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        }
      );
    }

    if (status) {
      queryBuilder.andWhere('request.status = :status', { status });
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
  }

  // Lấy đơn được giao cho tôi duyệt
  async findRequestsAssignedToMe(
    employeeId: number,
    options: IPaginationOptions,
    startDate?: string,
    endDate?: string,
    status?: string
  ): Promise<IPaginationResult<SupportRequest>> {
    const queryBuilder = this.supportRequestRepository
      .createQueryBuilder('request')
      .where('request.approverEmployeeIds @> :employeeId::int[]', {
        employeeId: `{${employeeId}}`,
      })
      .leftJoinAndSelect('request.items', 'items')
      .leftJoinAndSelect('items.supportType', 'supportType')
      .leftJoinAndSelect('request.employee', 'employee')
      .leftJoinAndSelect('employee.user', 'user')
      .leftJoinAndSelect('employee.position', 'position')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('request.factory', 'factory')
      .orderBy('request.createdAt', 'DESC');

    if (startDate && endDate) {
      queryBuilder.andWhere(
        'request.requestDate BETWEEN :startDate AND :endDate',
        {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        }
      );
    }

    if (status) {
      queryBuilder.andWhere('request.status = :status', { status });
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
  }

  // Quản lý xem tất cả đơn của factory
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
  ): Promise<IPaginationResult<SupportRequest>> {
    const queryBuilder = this.supportRequestRepository
      .createQueryBuilder('request')
      .where('request.factoryId = :factoryId', { factoryId })
      .leftJoinAndSelect('request.items', 'items')
      .leftJoinAndSelect('items.supportType', 'supportType')
      .leftJoinAndSelect('request.employee', 'employee')
      .leftJoinAndSelect('employee.user', 'user')
      .leftJoinAndSelect('employee.position', 'position')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('request.factory', 'factory')
      .leftJoinAndSelect('request.decidedBy', 'decidedBy')
      .leftJoinAndSelect('decidedBy.user', 'decidedByUser')
      .orderBy('request.createdAt', 'DESC');

    if (filters?.startDate && filters?.endDate) {
      queryBuilder.andWhere(
        'request.requestDate BETWEEN :startDate AND :endDate',
        {
          startDate: new Date(filters.startDate),
          endDate: new Date(filters.endDate),
        }
      );
    }

    if (filters?.employeeId) {
      queryBuilder.andWhere('request.employeeId = :employeeId', {
        employeeId: filters.employeeId,
      });
    }

    if (filters?.departmentId) {
      queryBuilder.andWhere('employee.departmentId = :departmentId', {
        departmentId: filters.departmentId,
      });
    }

    if (filters?.status) {
      queryBuilder.andWhere('request.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search.toLowerCase()}%`;
      queryBuilder.andWhere('(LOWER(user.fullName) LIKE :search)', {
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
  }

  // Xem chi tiết đơn
  async findOne(id: number): Promise<SupportRequest> {
    const request = await this.supportRequestRepository.findOne({
      where: { id },
      relations: [
        'items',
        'items.supportType',
        'employee',
        'employee.user',
        'employee.position',
        'employee.department',
        'factory',
        'decidedBy',
        'decidedBy.user',
      ],
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy đơn yêu cầu hỗ trợ');
    }

    // Lấy thông tin người duyệt
    if (request.approverEmployeeIds && request.approverEmployeeIds.length > 0) {
      const approvers = await this.employeeRepository.find({
        where: request.approverEmployeeIds.map(id => ({ id })),
        relations: ['user', 'position', 'department'],
      });
      (request as any).approvers = approvers;
    }

    return request;
  }

  // Cập nhật đơn (có thể cập nhật thông tin, hủy, hoặc duyệt/từ chối)
  async update(
    id: number,
    employeeId: number,
    dto: UpdateSupportRequestDto
  ): Promise<SupportRequest> {
    const request = await this.findOne(id);

    // Xử lý hủy đơn
    if (dto.status === 'cancelled') {
      if (request.employeeId !== employeeId) {
        throw new ForbiddenException('Bạn không có quyền hủy đơn này');
      }

      if (request.status !== 'pending') {
        throw new BadRequestException('Chỉ có thể hủy đơn đang chờ duyệt');
      }

      request.status = 'cancelled';
      const savedRequest = await this.supportRequestRepository.save(request);

      return savedRequest;
    } else if (dto.status === 'approved' || dto.status === 'rejected') {
      if (request.status !== 'pending') {
        throw new BadRequestException('Đơn này đã được xử lý');
      }

      request.status = dto.status;
      request.decidedByEmployeeId = employeeId;
      request.decisionNote = dto.decisionNote;
      request.decidedAt = new Date();

      await this.supportRequestRepository.save(request);

      // Gửi notification cho nhân viên
      await this.sendNotificationToEmployee(request);

      return this.findOne(id);
    }

    // Cập nhật items nếu có
    if (dto.items) {
      const isApproved = request.status === 'approved';

      if (isApproved) {
        // Nếu đơn đã được duyệt: chỉ cho phép thêm items/ảnh, không cho xóa
        const existingItems = await this.supportRequestItemRepository.find({
          where: { supportRequestId: id },
        });

        // Validate items mới
        const supportTypeIds = dto.items.map(item =>
          Number(item.supportTypeId)
        );
        const supportTypes = await this.supportTypeRepository.find({
          where: {
            id: In(supportTypeIds),
            factoryId: request.factoryId,
            isActive: true,
          },
        });

        for (const item of dto.items) {
          const supportType = supportTypes.find(
            st => Number(st.id) === Number(item.supportTypeId)
          );
          if (!supportType) {
            throw new BadRequestException('Một số loại hỗ trợ không hợp lệ');
          }
        }

        // Merge items: thêm items mới hoặc thêm ảnh vào items hiện có
        for (const itemDto of dto.items) {
          const existingItem = existingItems.find(
            item => Number(item.supportTypeId) === Number(itemDto.supportTypeId)
          );

          if (existingItem) {
            // Item đã tồn tại: chỉ thêm ảnh mới (merge với ảnh cũ)
            if (itemDto.photoUrls && itemDto.photoUrls.length > 0) {
              const existingPhotos = existingItem.photoUrls || [];
              const newPhotos = itemDto.photoUrls.filter(
                url => !existingPhotos.includes(url)
              );
              existingItem.photoUrls = [...existingPhotos, ...newPhotos];
              await this.supportRequestItemRepository.save(existingItem);
            }
            // Có thể cập nhật note nếu có
            if (itemDto.note !== undefined) {
              existingItem.note = itemDto.note;
              await this.supportRequestItemRepository.save(existingItem);
            }
          } else {
            // Item mới: tạo mới
            const supportType = supportTypes.find(
              st => Number(st.id) === Number(itemDto.supportTypeId)
            );
            if (!supportType) {
              throw new BadRequestException('Một số loại hỗ trợ không hợp lệ');
            }

            // Validate requirePhoto và requireQuantity cho item mới
            if (
              supportType.requirePhoto &&
              (!itemDto.photoUrls || itemDto.photoUrls.length === 0)
            ) {
              throw new BadRequestException(
                `Loại hỗ trợ "${supportType.name}" yêu cầu ảnh chứng minh`
              );
            }
            if (
              supportType.requireQuantity &&
              (!itemDto.quantity || itemDto.quantity <= 0)
            ) {
              throw new BadRequestException(
                `Loại hỗ trợ "${supportType.name}" yêu cầu nhập số lượng`
              );
            }

            const newItem = this.supportRequestItemRepository.create({
              supportRequestId: id,
              supportTypeId: Number(itemDto.supportTypeId),
              quantity: itemDto.quantity ?? 1,
              photoUrls: itemDto.photoUrls || [],
              note: itemDto.note,
            });
            await this.supportRequestItemRepository.save(newItem);
          }
        }
      } else {
        // Nếu đơn chưa được duyệt: cho phép xóa và tạo mới bình thường
        // Validate TRƯỚC KHI xóa để tránh mất dữ liệu nếu validation fail
        const supportTypeIds = dto.items.map(item =>
          Number(item.supportTypeId)
        );
        const supportTypes = await this.supportTypeRepository.find({
          where: {
            id: In(supportTypeIds),
            factoryId: request.factoryId,
            isActive: true,
          },
        });

        if (supportTypes.length !== supportTypeIds.length) {
          throw new BadRequestException('Một số loại hỗ trợ không hợp lệ');
        }

        for (const item of dto.items) {
          const supportType = supportTypes.find(
            st => Number(st.id) === Number(item.supportTypeId)
          );
          if (!supportType) {
            throw new BadRequestException('Một số loại hỗ trợ không hợp lệ');
          }
          if (
            supportType.requirePhoto &&
            (!item.photoUrls || item.photoUrls.length === 0)
          ) {
            throw new BadRequestException(
              `Loại hỗ trợ "${supportType.name}" yêu cầu ảnh chứng minh`
            );
          }
          if (
            supportType.requireQuantity &&
            (!item.quantity || item.quantity <= 0)
          ) {
            throw new BadRequestException(
              `Loại hỗ trợ "${supportType.name}" yêu cầu nhập số lượng`
            );
          }
        }

        // Chỉ xóa sau khi validation pass
        await this.supportRequestItemRepository.delete({
          supportRequestId: id,
        });

        const newItems = dto.items.map(item =>
          this.supportRequestItemRepository.create({
            supportRequestId: id,
            supportTypeId: Number(item.supportTypeId),
            quantity: item.quantity ?? 1,
            photoUrls: item.photoUrls,
            note: item.note,
          })
        );

        await this.supportRequestItemRepository.save(newItems);
      }
    }

    // Cập nhật thông tin request (nếu có thay đổi)
    // Chỉ save nếu có thay đổi approverEmployeeIds hoặc note
    if (dto.approverEmployeeIds || dto.note !== undefined) {
      // Reload request để tránh TypeORM track items cũ
      const requestToUpdate = await this.supportRequestRepository.findOne({
        where: { id },
        // Không load items để tránh cascade update
      });

      if (!requestToUpdate) {
        throw new NotFoundException('Không tìm thấy đơn yêu cầu hỗ trợ');
      }

      if (dto.approverEmployeeIds) {
        requestToUpdate.approverEmployeeIds = dto.approverEmployeeIds;
      }
      if (dto.note !== undefined) {
        requestToUpdate.note = dto.note;
      }

      await this.supportRequestRepository.save(requestToUpdate);
    }

    return this.findOne(id);
  }

  // Gửi notification cho nhân viên khi đơn được duyệt/từ chối
  private async sendNotificationToEmployee(
    request: SupportRequest
  ): Promise<void> {
    try {
      const employee = await this.employeeRepository.findOne({
        where: { id: request.employeeId },
        relations: ['user'],
      });

      if (!employee?.userId) return;

      const statusText =
        request.status === 'approved' ? 'được duyệt' : 'bị từ chối';

      await this.notificationService.sendNotificationToMultipleUsers(
        [employee.userId],
        `Yêu cầu hỗ trợ ${statusText}`,
        `Yêu cầu hỗ trợ ngày ${new Date(request.requestDate).toLocaleDateString(
          'vi-VN'
        )} đã ${statusText}`,
        NOTIFICATION_TYPE.SUPPORT_REQUEST_DECIDED,
        request.id,
        { status: request.status, decisionNote: request.decisionNote }
      );
    } catch (error) {
      this.error('Error sending notification to employee:', error);
    }
  }

  /**
   * Gửi thông báo nhắc duyệt đến các approvers
   */
  async sendReminderToApprovers(id: number): Promise<void> {
    const request = await this.supportRequestRepository.findOne({
      where: { id },
      relations: ['employee', 'employee.user'],
    });

    if (!request) {
      throw new NotFoundException('Đơn yêu cầu hỗ trợ không tồn tại');
    }

    // Chỉ gửi reminder cho đơn đang pending
    if (request.status !== 'pending') {
      throw new BadRequestException(
        'Chỉ có thể gửi nhắc duyệt cho đơn đang chờ duyệt'
      );
    }

    if (
      !request.approverEmployeeIds ||
      request.approverEmployeeIds.length === 0
    ) {
      throw new BadRequestException('Đơn này không có người duyệt');
    }

    try {
      const employee = request.employee;
      const employeeName = employee?.user?.fullName || 'Nhân viên';

      const approvers = await this.employeeRepository.find({
        where: request.approverEmployeeIds.map(id => ({ id })),
        relations: ['user'],
      });

      const approverUserIds = approvers
        .filter(a => a?.userId)
        .map(a => a.userId);

      if (approverUserIds.length > 0) {
        await this.notificationService.sendNotificationToMultipleUsers(
          approverUserIds,
          'Nhắc duyệt yêu cầu hỗ trợ',
          `${employeeName} đã gửi yêu cầu hỗ trợ ngày ${new Date(
            request.requestDate
          ).toLocaleDateString('vi-VN')} - Vui lòng xem xét duyệt`,
          NOTIFICATION_TYPE.SUPPORT_REQUEST_REMINDER,
          request.id,
          { employeeName, requestDate: request.requestDate }
        );
      }
    } catch (error) {
      this.error('Error sending reminder notification:', error);
      throw error;
    }
  }

  /**
   * Export support requests to XLSX
   * Format:
   * - Các cột là từng ngày trong tháng
   * - Mỗi ngày hiển thị: "x" cho qua đêm/làm quá 20h30, số lượng cho hỗ trợ xe
   * - Mỗi nhân viên có các hàng con tương ứng với số loại hỗ trợ
   * - 5 cột tổng hợp ở cuối (merge = số lượng hàng con)
   */
  async generateSupportRequestXLSX(
    factoryId: number,
    year: number,
    month: number
  ): Promise<ArrayBuffer> {
    try {
      const factory = await this.factoryRepository.findOne({
        where: { id: factoryId },
      });

      // Lấy tất cả support types của factory (active)
      const supportTypes = await this.supportTypeRepository.find({
        where: {
          factoryId,
          isActive: true,
        },
        order: { code: 'ASC' },
      });

      // Tính số ngày trong tháng
      const daysInMonth = new Date(year, month, 0).getDate();

      // Tính ngày đầu và cuối tháng
      const startDate = new Date(year, month - 1, 1);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(year, month, 0);
      endDate.setHours(23, 59, 59, 999);

      // Lấy tất cả support requests đã approved trong tháng
      const supportRequests = await this.supportRequestRepository.find({
        where: {
          factoryId,
          status: 'approved',
          requestDate: Between(startDate, endDate),
        },
        relations: [
          'employee',
          'employee.user',
          'employee.position',
          'employee.department',
          'items',
          'items.supportType',
        ],
        order: {
          requestDate: 'ASC',
          employeeId: 'ASC',
        },
      });

      // Group requests by employee and date
      const requestsByEmployeeAndDate = new Map<string, SupportRequest[]>();
      for (const request of supportRequests) {
        // Xử lý requestDate (có thể là Date hoặc string)
        const requestDate =
          request.requestDate instanceof Date
            ? request.requestDate
            : new Date(request.requestDate);
        const dateStr = requestDate.toISOString().split('T')[0];
        const key = `${request.employeeId}_${dateStr}`;
        if (!requestsByEmployeeAndDate.has(key)) {
          requestsByEmployeeAndDate.set(key, []);
        }
        requestsByEmployeeAndDate.get(key)!.push(request);
      }

      // Tạo workbook
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Hỗ trợ');

      // Tính số cột
      const baseCols = 5; // STT, Tên, Vị trí, Phòng ban, Loại hỗ trợ
      const totalCols = baseCols + daysInMonth + 5; // +5 cột tổng hợp

      // Factory name at row 1
      sheet.addRow([factory?.name ?? 'Nhà máy']);
      sheet.mergeCells(1, 1, 1, totalCols);
      const factoryNameCell = sheet.getCell(1, 1);
      factoryNameCell.font = { bold: true, size: 16 };
      factoryNameCell.alignment = { horizontal: 'left' };

      // Title at row 2
      sheet.addRow([`Bảng tổng hợp hỗ trợ tháng ${month}/${year}`]);
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
        'Loại hỗ trợ',
        ...Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`), // Các ngày trong tháng
        ...supportTypes.slice(0, 5).map(st => st.name), // 5 cột tổng hợp (tên loại hỗ trợ)
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
        ...Array.from({ length: 5 }, () => ''), // Cột tổng hợp
      ]);

      // Merge header
      sheet.mergeCells(3, 1, 4, 1); // STT
      sheet.mergeCells(3, 2, 4, 2); // Tên nhân viên
      sheet.mergeCells(3, 3, 4, 3); // Vị trí
      sheet.mergeCells(3, 4, 4, 4); // Phòng ban
      sheet.mergeCells(3, 5, 4, 5); // Loại hỗ trợ
      // Merge 5 cột tổng hợp
      for (let i = 0; i < 5; i++) {
        sheet.mergeCells(
          3,
          baseCols + daysInMonth + 1 + i,
          4,
          baseCols + daysInMonth + 1 + i
        );
      }

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
      sheet.getColumn(1).width = 6; // STT
      sheet.getColumn(2).width = 24; // Tên
      sheet.getColumn(3).width = 16; // Vị trí
      sheet.getColumn(4).width = 16; // Phòng ban
      sheet.getColumn(5).width = 16; // Loại hỗ trợ
      for (let col = baseCols + 1; col <= baseCols + daysInMonth; col++) {
        sheet.getColumn(col).width = 6; // Day columns
      }
      for (let i = 0; i < 5; i++) {
        sheet.getColumn(baseCols + daysInMonth + 1 + i).width = 16; // Tổng columns
      }

      // Get unique employees
      const employeeMap = new Map<number, any>();
      for (const request of supportRequests) {
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

          // Số hàng con = số loại hỗ trợ của nhà máy
          const numSubRows = supportTypes.length;

          // Tạo các hàng con (mỗi loại hỗ trợ = 1 hoặc 2 hàng tùy có note hay không)
          const startRow = sheet.rowCount + 1;
          for (let subRowIdx = 0; subRowIdx < numSubRows; subRowIdx++) {
            const supportType = supportTypes[subRowIdx];
            const typeId = Number(supportType.id);

            // Row 1: Giá trị (số lượng hoặc "x")
            const row1Values: (string | number)[] = [
              subRowIdx === 0 ? index : '', // STT chỉ ở hàng đầu
              subRowIdx === 0 ? (employee as any).user?.fullName || '' : '', // Tên chỉ ở hàng đầu
              subRowIdx === 0
                ? (employee as any).position?.name || 'Chưa xác định'
                : '', // Vị trí chỉ ở hàng đầu
              subRowIdx === 0
                ? (employee as any).department?.name || 'Chưa xác định'
                : '', // Phòng ban chỉ ở hàng đầu
              supportType.name, // Tên loại hỗ trợ (hiển thị theo hàng)
            ];

            // Row 2: Notes (chỉ thêm nếu có note)
            const row2Values: (string | number)[] = ['', '', '', '', ''];

            // Dữ liệu cho từng ngày trong tháng
            const dayTotals: number[] = [];
            let hasAnyNote = false;

            for (let day = 1; day <= daysInMonth; day++) {
              const dateStr = `${year}-${String(month).padStart(
                2,
                '0'
              )}-${String(day).padStart(2, '0')}`;
              const key = `${employeeId}_${dateStr}`;
              const dayRequests = requestsByEmployeeAndDate.get(key) || [];

              // Tính tổng số lượng và thu thập notes cho loại hỗ trợ này trong ngày
              let dayTotal = 0;
              const dayNotes: string[] = [];
              for (const request of dayRequests) {
                for (const item of request.items || []) {
                  if (Number(item.supportTypeId) === typeId) {
                    dayTotal += Number(item.quantity || 1);
                    // Thu thập note nếu có
                    if (item.note && item.note.trim()) {
                      dayNotes.push(item.note.trim());
                    }
                  }
                }
              }

              dayTotals.push(dayTotal);

              // Row 1: Hiển thị giá trị (không kèm note)
              if (dayTotal > 0) {
                const displayValue = supportType.requireQuantity
                  ? dayTotal
                  : 'x';
                row1Values.push(displayValue);
              } else {
                row1Values.push('');
              }

              // Row 2: Notes
              const noteStr = dayNotes.length > 0 ? dayNotes.join(', ') : '';
              if (noteStr) {
                hasAnyNote = true;
              }
              row2Values.push(noteStr);
            }

            // 5 cột tổng hợp (để trống, sẽ merge và tính sau)
            row1Values.push('', '', '', '', '');
            row2Values.push('', '', '', '', '');

            // Thêm row 1 (giá trị)
            const r1 = sheet.addRow(row1Values);

            // Thêm row 2 (notes) nếu có note
            const r2 = hasAnyNote ? sheet.addRow(row2Values) : null;

            // Style row 1
            for (let c = 1; c <= totalCols; c++) {
              const cell = r1.getCell(c);
              this.setThinBorder(cell);

              if (c === 1) {
                // STT column
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
              } else if (c === 5) {
                // Loại hỗ trợ column
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
              } else if (c >= baseCols + 1 && c <= baseCols + daysInMonth) {
                // Day columns
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                if (
                  cell.value &&
                  cell.value !== '' &&
                  typeof cell.value === 'number'
                ) {
                  cell.numFmt = '0.00';
                }
              } else if (c > baseCols + daysInMonth) {
                // Tổng columns
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
              } else {
                // Base columns (Tên, Vị trí, Phòng ban)
                cell.alignment = { horizontal: 'left', vertical: 'middle' };
              }
            }

            // Style row 2 (notes) nếu có
            if (r2) {
              for (let c = 1; c <= totalCols; c++) {
                const cell = r2.getCell(c);
                this.setThinBorder(cell);

                if (c >= baseCols + 1 && c <= baseCols + daysInMonth) {
                  // Day columns - notes
                  cell.alignment = { horizontal: 'left', vertical: 'middle' };
                  cell.font = { italic: true, size: 9, color: { argb: 'FF666666' } };
                } else {
                  cell.alignment = { horizontal: 'center', vertical: 'middle' };
                }
              }

              // Merge cột Loại hỗ trợ qua 2 hàng
              const typeRowStart = r1.number;
              sheet.mergeCells(typeRowStart, 5, typeRowStart + 1, 5);
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
            // Không merge cột Loại hỗ trợ vì mỗi hàng con có tên loại hỗ trợ khác nhau

            // Tính tổng cho từng loại hỗ trợ (sử dụng lại dayTotals đã tính ở trên)
            const totalsByType: number[] = [];
            for (let subRowIdx = 0; subRowIdx < numSubRows; subRowIdx++) {
              // Tính tổng từ các dayTotals đã lưu trong các hàng con
              // Nhưng cần tính lại vì mỗi hàng con chỉ có dayTotals của loại đó
              let typeTotal = 0;
              for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month).padStart(
                  2,
                  '0'
                )}-${String(day).padStart(2, '0')}`;
                const key = `${employeeId}_${dateStr}`;
                const dayRequests = requestsByEmployeeAndDate.get(key) || [];

                const supportType = supportTypes[subRowIdx];
                const typeId = Number(supportType.id);

                for (const request of dayRequests) {
                  for (const item of request.items || []) {
                    if (Number(item.supportTypeId) === typeId) {
                      typeTotal += Number(item.quantity || 1);
                    }
                  }
                }
              }
              totalsByType.push(typeTotal);
            }

            // Merge 5 cột tổng hợp và điền giá trị
            for (let i = 0; i < 5; i++) {
              const col = baseCols + daysInMonth + 1 + i;
              sheet.mergeCells(startRow, col, endRow, col);

              const totalCell = sheet.getCell(startRow, col);
              if (i < totalsByType.length) {
                // Hiển thị tổng của loại hỗ trợ tương ứng
                const total = totalsByType[i];
                totalCell.value = total > 0 ? total : '';
                totalCell.numFmt = '0.00';
              } else {
                // Nếu không đủ 5 loại hỗ trợ, để trống
                totalCell.value = '';
              }
              totalCell.alignment = {
                horizontal: 'center',
                vertical: 'middle',
              };
            }
          }

          index++;
        }
      }

      return await workbook.xlsx.writeBuffer();
    } catch (error) {
      this.error('Error generating support request XLSX:', error);
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
