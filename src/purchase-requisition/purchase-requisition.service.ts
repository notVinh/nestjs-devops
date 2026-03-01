import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PurchaseRequisition } from './entities/purchase-requisition.entity';
import { Employee } from 'src/employee/entities/employee.entity';
import { MisaOrder } from 'src/misa-order/entities/misa-order.entity';
import { MisaSaOrder } from 'src/misa-token/entities/misa-sa-order.entity';
import { CreatePurchaseRequisitionDto } from './dto/create-purchase-requisition.dto';
import { ApprovePurchaseRequisitionDto } from './dto/approve-purchase-requisition.dto';
import { RejectPurchaseRequisitionDto } from './dto/reject-purchase-requisition.dto';
import { RequestRevisionPurchaseRequisitionDto } from './dto/request-revision-purchase-requisition.dto';
import { ResubmitPurchaseRequisitionDto } from './dto/resubmit-purchase-requisition.dto';
import { ConfirmPurchaseRequisitionDto } from './dto/confirm-purchase-requisition.dto';
import { NotificationService } from 'src/notification/notification.service';
import { NOTIFICATION_TYPE } from 'src/notification/constants/notification-type.constant';
import {
  throwBadRequestError,
  throwNotFoundError,
  throwForbiddenError,
} from 'src/utils/error.helper';
import { hasEmployeePermission, mergeEmployeePermissions } from 'src/utils/employee-permissions.helper';

@Injectable()
export class PurchaseRequisitionService {
  private readonly context = 'PurchaseRequisitionService';

  constructor(
    @InjectRepository(PurchaseRequisition)
    private readonly requisitionRepository: Repository<PurchaseRequisition>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(MisaOrder)
    private readonly misaOrderRepository: Repository<MisaOrder>,
    @InjectRepository(MisaSaOrder)
    private readonly misaSaOrderRepository: Repository<MisaSaOrder>,
    private readonly notificationService: NotificationService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  private log(message: string) {
    this.logger.info(message, { context: this.context });
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

  /**
   * Tạo đề xuất mua hàng
   * - Có thể tạo thủ công không cần liên kết đơn hàng (misaOrderId và misaSaOrderId đều null)
   * - Hoặc liên kết với MisaOrder cũ hoặc MisaSaOrder mới
   * @param dto - DTO tạo đề xuất
   * @param createdByEmployeeId - ID employee tạo đề xuất
   * @param factoryId - ID nhà máy
   * @param approvers - Danh sách employees có quyền approve (optional, để tránh query lại)
   */
  async create(
    dto: CreatePurchaseRequisitionDto,
    createdByEmployeeId: number,
    factoryId: number,
    approvers?: Employee[],
  ): Promise<PurchaseRequisition> {
    let misaOrder: MisaOrder | null = null;
    let misaSaOrder: MisaSaOrder | null = null;

    // Nếu có misaOrderId thì kiểm tra đơn hàng tồn tại
    if (dto.misaOrderId) {
      misaOrder = await this.misaOrderRepository.findOne({
        where: { id: dto.misaOrderId },
      });

      if (!misaOrder) {
        throwNotFoundError('Không tìm thấy đơn hàng Misa');
      }

      // Kiểm tra đã có đề xuất chưa (tránh tạo trùng) - chỉ check khi có misaOrderId
      const existingRequisition = await this.requisitionRepository.findOne({
        where: {
          misaOrderId: dto.misaOrderId,
          status: 'pending',
        },
      });

      if (existingRequisition) {
        this.warn(
          `Đề xuất mua hàng đã tồn tại cho đơn hàng ${dto.misaOrderId}, trả về đề xuất hiện có`,
        );
        return this.findOne(existingRequisition.id);
      }
    }

    // Nếu có misaSaOrderId thì kiểm tra đã có đề xuất pending chưa và load SaOrder
    if (dto.misaSaOrderId) {
      misaSaOrder = await this.misaSaOrderRepository.findOne({
        where: { id: dto.misaSaOrderId },
      });

      const existingRequisition = await this.requisitionRepository.findOne({
        where: {
          misaSaOrderId: dto.misaSaOrderId,
          status: 'pending',
        },
      });

      if (existingRequisition) {
        this.warn(
          `Đề xuất mua hàng đã tồn tại cho đơn bán hàng ${dto.misaSaOrderId}, trả về đề xuất hiện có`,
        );
        return this.findOne(existingRequisition.id);
      }
    }

    // Xác định trạng thái ban đầu:
    // - Nếu tạo tự động từ đơn bán hàng (isAutoFromSalesOrder = true) → auto approve
    // - Nếu tạo thường → pending, cần duyệt
    const isAutoApprove = dto.isAutoFromSalesOrder === true;
    const initialStatus = isAutoApprove ? 'approved' : 'pending';

    // Tạo đề xuất mua hàng
    const requisition = this.requisitionRepository.create({
      requisitionNumber: dto.requisitionNumber,
      misaOrderId: dto.misaOrderId || null,
      misaSaOrderId: dto.misaSaOrderId || null,
      factoryId,
      notes: dto.notes,
      createdByEmployeeId,
      status: initialStatus,
      // Nếu auto approve thì ghi nhận người tạo là người duyệt
      approvedByEmployeeId: isAutoApprove ? createdByEmployeeId : null,
      approvedAt: isAutoApprove ? new Date() : null,
      approvalNotes: isAutoApprove ? 'Tự động duyệt từ đơn bán hàng' : null,
    });

    const savedRequisition = await this.requisitionRepository.save(requisition);

    if (isAutoApprove) {
      // Nếu auto approve → gửi thông báo cho người tạo đơn mua hàng
      this.log(`Auto approve đề xuất mua hàng ${savedRequisition.requisitionNumber} (từ đơn bán hàng)`);
      await this.notifyPurchaseOrderCreatorsForAutoApproved(savedRequisition, misaSaOrder);
    } else {
      // Nếu tạo thường → gửi thông báo cho những người có quyền approve_purchase_requisition hoặc receive_notification_of_purchase_requisition
      await this.notifyRequisitionApprovers(savedRequisition, misaOrder, misaSaOrder, approvers);
    }

    return this.findOne(savedRequisition.id);
  }

  /**
   * Lấy chi tiết đề xuất
   */
  async findOne(id: number): Promise<PurchaseRequisition> {
    const found = await this.requisitionRepository.findOne({
      where: { id },
      relations: [
        'createdBy',
        'createdBy.user',
        'approvedBy',
        'approvedBy.user',
        'purchaseConfirmedBy',
        'purchaseConfirmedBy.user',
        'misaOrder',
        'misaOrder.items',
        'misaOrder.createdBy',
        'misaOrder.createdBy.user',
        'factory',
      ],
    });

    if (!found) {
      throwNotFoundError('Không tìm thấy đề xuất mua hàng');
    }

    return found;
  }

  /**
   * Lấy danh sách đề xuất mua hàng (với pagination và filter)
   * @param employeeId - ID employee (có thể null cho SuperAdmin)
   */
  async findAll(
    employeeId: number | null,
    page: number = 1,
    limit: number = 10,
    status?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    // Nếu có employeeId, filter theo factoryId của employee
    if (employeeId) {
      const employee = await this.employeeRepository.findOne({
        where: { id: employeeId },
      });

      if (employee?.factoryId) {
        where.factoryId = employee.factoryId;
      }
    }
    // Nếu không có employeeId (SuperAdmin), không filter theo factoryId - xem tất cả

    if (status) {
      where.status = status;
    }

    if (startDate && endDate) {
      where.createdAt = Between(
        new Date(startDate),
        new Date(endDate + 'T23:59:59'),
      );
    }

    const [data, total] = await this.requisitionRepository.findAndCount({
      where,
      relations: [
        'createdBy',
        'createdBy.user',
        'approvedBy',
        'approvedBy.user',
        'misaOrder',
        'factory',
      ],
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Duyệt đề xuất mua hàng
   * Gửi thông báo cho những người có quyền "approve_purchase_orders" (người tạo đơn mua hàng)
   */
  async approve(
    id: number,
    dto: ApprovePurchaseRequisitionDto,
    approvedByEmployeeId: number,
  ): Promise<PurchaseRequisition> {
    // Kiểm tra quyền duyệt
    const employee = await this.employeeRepository.findOne({
      where: { id: approvedByEmployeeId },
      relations: ['roleGroups', 'user'],
    });

    if (!employee) {
      throwNotFoundError('Không tìm thấy thông tin nhân viên');
    }

    // Check permission từ roleGroups + permissions cũ
    if (!hasEmployeePermission(employee, 'approve_purchase_requisition')) {
      throwForbiddenError('Bạn không có quyền duyệt đề xuất mua hàng');
    }

    const requisition = await this.requisitionRepository.findOne({
      where: { id },
      relations: ['misaOrder'],
    });

    if (!requisition) {
      throwNotFoundError('Không tìm thấy đề xuất mua hàng');
    }

    if (requisition.status !== 'pending') {
      throwBadRequestError('Chỉ có thể duyệt đề xuất ở trạng thái chờ duyệt');
    }

    // Cập nhật trạng thái
    await this.requisitionRepository.update(id, {
      status: 'approved',
      approvedByEmployeeId,
      approvedAt: new Date(),
      approvalNotes: dto.notes,
    });

    // Gửi thông báo cho những người có quyền tạo đơn mua hàng (approve_purchase_orders)
    await this.notifyPurchaseOrderCreators(requisition);

    // Gửi thông báo cho người tạo đề xuất
    const approverName = employee.user?.fullName || 'Người duyệt';
    await this.notifyCreatorOnApprovalOrRejection(requisition, true, approverName, dto.notes);

    this.log(`Duyệt đề xuất mua hàng ${requisition.requisitionNumber}`);

    return this.findOne(id);
  }

  /**
   * Từ chối đề xuất mua hàng
   */
  async reject(
    id: number,
    dto: RejectPurchaseRequisitionDto,
    rejectedByEmployeeId: number,
  ): Promise<PurchaseRequisition> {
    // Kiểm tra quyền duyệt
    const employee = await this.employeeRepository.findOne({
      where: { id: rejectedByEmployeeId },
      relations: ['roleGroups', 'user'],
    });

    if (!employee) {
      throwNotFoundError('Không tìm thấy thông tin nhân viên');
    }

    // Check permission từ roleGroups + permissions cũ
    if (!hasEmployeePermission(employee, 'approve_purchase_requisition')) {
      throwForbiddenError('Bạn không có quyền từ chối đề xuất mua hàng');
    }

    const requisition = await this.requisitionRepository.findOne({
      where: { id },
    });

    if (!requisition) {
      throwNotFoundError('Không tìm thấy đề xuất mua hàng');
    }

    if (requisition.status !== 'pending') {
      throwBadRequestError('Chỉ có thể từ chối đề xuất ở trạng thái chờ duyệt');
    }

    // Cập nhật trạng thái
    await this.requisitionRepository.update(id, {
      status: 'rejected',
      approvedByEmployeeId: rejectedByEmployeeId,
      approvedAt: new Date(),
      approvalNotes: dto.reason,
    });

    // Gửi thông báo cho người tạo đề xuất
    const rejecterName = employee.user?.fullName || 'Người duyệt';
    await this.notifyCreatorOnApprovalOrRejection(requisition, false, rejecterName, dto.reason);

    this.log(`Từ chối đề xuất mua hàng ${requisition.requisitionNumber}`);

    return this.findOne(id);
  }

  /**
   * Yêu cầu chỉnh sửa đề xuất mua hàng
   * Gửi thông báo cho người tạo đề xuất
   */
  async requestRevision(
    id: number,
    dto: RequestRevisionPurchaseRequisitionDto,
    requestedByEmployeeId: number,
  ): Promise<PurchaseRequisition> {
    // Kiểm tra quyền duyệt
    const employee = await this.employeeRepository.findOne({
      where: { id: requestedByEmployeeId },
      relations: ['user', 'roleGroups'],
    });

    if (!employee) {
      throwNotFoundError('Không tìm thấy thông tin nhân viên');
    }

    // Check permission từ roleGroups + permissions cũ
    if (!hasEmployeePermission(employee, 'approve_purchase_requisition')) {
      throwForbiddenError('Bạn không có quyền yêu cầu chỉnh sửa đề xuất mua hàng');
    }

    const requisition = await this.requisitionRepository.findOne({
      where: { id },
      relations: ['createdBy', 'createdBy.user', 'misaOrder'],
    });

    if (!requisition) {
      throwNotFoundError('Không tìm thấy đề xuất mua hàng');
    }

    if (requisition.status !== 'pending') {
      throwBadRequestError('Chỉ có thể yêu cầu chỉnh sửa đề xuất ở trạng thái chờ duyệt');
    }

    // Cập nhật trạng thái
    await this.requisitionRepository.update(id, {
      status: 'revision_required',
      revisionReason: dto.reason,
      revisionRequestedByEmployeeId: requestedByEmployeeId,
      revisionRequestedAt: new Date(),
    });

    // Gửi thông báo cho người tạo đề xuất
    await this.notifyCreatorForRevision(requisition, dto.reason, employee);

    this.log(`Yêu cầu chỉnh sửa đề xuất mua hàng ${requisition.requisitionNumber}`);

    return this.findOne(id);
  }

  /**
   * Gửi lại đề xuất mua hàng sau khi chỉnh sửa
   * Gửi thông báo cho những người có quyền duyệt
   */
  async resubmit(
    id: number,
    dto: ResubmitPurchaseRequisitionDto,
    resubmittedByEmployeeId: number,
  ): Promise<PurchaseRequisition> {
    const requisition = await this.requisitionRepository.findOne({
      where: { id },
      relations: ['misaOrder'],
    });

    if (!requisition) {
      throwNotFoundError('Không tìm thấy đề xuất mua hàng');
    }

    // Chỉ người tạo mới được gửi lại
    // if (requisition.createdByEmployeeId !== resubmittedByEmployeeId) {
    // throwForbiddenError('Chỉ người tạo đề xuất mới có thể gửi lại');
    // }

    // if (requisition.status !== 'revision_required') {
    //  throwBadRequestError('Chỉ có thể gửi lại đề xuất ở trạng thái yêu cầu chỉnh sửa');
    // }

    // Cập nhật trạng thái về pending
    const updateData: any = {
      status: 'pending',
      revisionReason: null,
      revisionRequestedByEmployeeId: null,
      revisionRequestedAt: null,
    };

    // Nếu có notes mới, cập nhật notes
    if (dto.notes) {
      updateData.notes = dto.notes;
    }

    await this.requisitionRepository.update(id, updateData);

    // Gửi thông báo cho những người có quyền duyệt
    const misaOrder = requisition.misaOrder || (requisition.misaOrderId ? await this.misaOrderRepository.findOne({
      where: { id: requisition.misaOrderId },
    }) : null);

    if (misaOrder) {
      await this.notifyRequisitionApproversForResubmit(requisition, misaOrder);
    }

    this.log(`Gửi lại đề xuất mua hàng ${requisition.requisitionNumber}`);

    return this.findOne(id);
  }

  /**
   * Xác nhận đã mua hàng cho đề xuất mua hàng
   * - Chỉ cho phép với đề xuất đã được duyệt (approved)
   * - Yêu cầu permission receive_notification_of_purchase_requisition (người nhận thông báo DXMH được duyệt cũng là người xác nhận mua hàng)
   * - Gửi thông báo cho người tạo đề xuất và người duyệt
   */
  async confirmPurchase(
    id: number,
    dto: ConfirmPurchaseRequisitionDto,
    confirmedByEmployeeId: number,
  ): Promise<PurchaseRequisition> {
    // Kiểm tra quyền xác nhận mua hàng
    const employee = await this.employeeRepository.findOne({
      where: { id: confirmedByEmployeeId },
      relations: ['roleGroups', 'user'],
    });

    if (!employee) {
      throwNotFoundError('Không tìm thấy thông tin nhân viên');
    }

    // Check permission từ roleGroups + permissions cũ
    // Dùng permission receive_notification_of_purchase_requisition vì người nhận thông báo DXMH được duyệt cũng là người xác nhận mua hàng
    if (!hasEmployeePermission(employee, 'receive_notification_of_purchase_requisition')) {
      throwForbiddenError('Bạn không có quyền xác nhận mua hàng');
    }

    const requisition = await this.requisitionRepository.findOne({
      where: { id },
      relations: ['createdBy', 'createdBy.user', 'approvedBy', 'approvedBy.user', 'misaOrder', 'misaSaOrder'],
    });

    if (!requisition) {
      throwNotFoundError('Không tìm thấy đề xuất mua hàng');
    }

    if (requisition.status !== 'approved') {
      throwBadRequestError('Chỉ có thể xác nhận mua hàng cho đề xuất đã được duyệt');
    }

    // Cập nhật trạng thái
    await this.requisitionRepository.update(id, {
      status: 'purchase_confirmed',
      purchaseConfirmedByEmployeeId: confirmedByEmployeeId,
      purchaseConfirmedAt: new Date(),
      purchaseConfirmNotes: dto.notes,
    });

    // Gửi thông báo cho người tạo đề xuất và người duyệt
    const confirmerName = employee.user?.fullName || 'Nhân viên';
    await this.notifyPurchaseConfirmed(requisition, confirmerName, dto.notes);

    this.log(`Xác nhận mua hàng cho đề xuất ${requisition.requisitionNumber}`);

    return this.findOne(id);
  }

  /**
   * Xóa đề xuất mua hàng (soft delete)
   */
  async delete(id: number): Promise<void> {
    const requisition = await this.requisitionRepository.findOne({
      where: { id },
    });

    if (!requisition) {
      throwNotFoundError('Không tìm thấy đề xuất mua hàng');
    }

    // Chỉ cho phép xóa đề xuất pending
    if (requisition.status !== 'pending') {
      throwBadRequestError('Chỉ có thể xóa đề xuất ở trạng thái chờ duyệt');
    }

    await this.requisitionRepository.softDelete(id);
  }

  /**
   * Gửi thông báo cho những người có quyền liên quan đến đề xuất mua hàng:
   * - approve_purchase_requisition: Người có quyền duyệt
   * - receive_notification_of_purchase_requisition: Người nhận thông báo
   * @param requisition - Đề xuất mua hàng
   * @param misaOrder - Đơn hàng MISA (có thể null nếu tạo DXMH thủ công)
   * @param misaSaOrder - Đơn bán hàng MISA (có thể null)
   * @param approvers - Danh sách employees có quyền approve (optional, nếu đã được query trước đó)
   */
  private async notifyRequisitionApprovers(
    requisition: PurchaseRequisition,
    misaOrder: MisaOrder | null,
    misaSaOrder: MisaSaOrder | null,
    approvers?: Employee[],
  ) {
    try {
      // Query tất cả employees trong factory này
      const allEmployees = await this.employeeRepository
        .createQueryBuilder('employee')
        .where('employee.factoryId = :factoryId', {
          factoryId: requisition.factoryId,
        })
        .leftJoinAndSelect('employee.user', 'user')
        .leftJoinAndSelect('employee.roleGroups', 'roleGroups')
        .getMany();

      // Filter employees có quyền approve_purchase_requisition HOẶC receive_notification_of_purchase_requisition
      const employeesToNotify = allEmployees.filter(emp =>
        hasEmployeePermission(emp, 'approve_purchase_requisition') ||
        hasEmployeePermission(emp, 'receive_notification_of_purchase_requisition')
      );

      if (employeesToNotify.length === 0) {
        this.warn(
          'Không có nhân viên nào có quyền liên quan đến đề xuất mua hàng trong factory này',
        );
        return;
      }

      // Build notification message
      let orderInfo = 'Đề xuất mua hàng thủ công';
      let orderNumber = 'N/A';
      let customerName: string | undefined = undefined;

      if (misaOrder) {
        orderInfo = `Đơn hàng: ${misaOrder.orderNumber}\nKhách hàng: ${misaOrder.customerName || 'Không xác định'}`;
        orderNumber = misaOrder.orderNumber;
        customerName = misaOrder.customerName;
      } else if (misaSaOrder) {
        orderInfo = `Đơn bán hàng: ${misaSaOrder.refNo}\nKhách hàng: ${misaSaOrder.accountObjectName || 'Không xác định'}`;
        orderNumber = misaSaOrder.refNo;
        customerName = misaSaOrder.accountObjectName || undefined;
      }

      // Gửi thông báo cho từng employee
      const notifications = employeesToNotify
        .filter((emp) => emp.userId)
        .map((emp) =>
          this.notificationService.sendNotificationToUser(
            emp.userId!,
            `Đề xuất mua hàng mới: ${requisition.requisitionNumber}`,
            `${orderInfo}\n${requisition.notes ? `Ghi chú: ${requisition.notes}\n` : ''}Nhấn để xem chi tiết`,
            NOTIFICATION_TYPE.PURCHASE_REQUISITION_CREATED,
            requisition.id,
            {
              requisitionNumber: requisition.requisitionNumber,
              orderNumber: orderNumber,
              customerName: customerName,
            },
          ),
        );

      const results = await Promise.allSettled(notifications);
      const sent = results.filter((r) => r.status === 'fulfilled').length;

      this.log(
        `Gửi ${sent}/${employeesToNotify.length} thông báo đề xuất mua hàng mới`,
      );
    } catch (error) {
      this.error('Lỗi gửi thông báo cho approvers', error);
    }
  }

  /**
   * Gửi thông báo cho những người có quyền "approve_purchase_orders" (người tạo đơn mua hàng)
   */
  private async notifyPurchaseOrderCreators(requisition: PurchaseRequisition) {
    try {
      // Load misaOrder để lấy thông tin
      if (!requisition.misaOrderId) {
        this.warn(`Không có misaOrderId cho đề xuất ${requisition.id}`);
        return;
      }

      const misaOrder = await this.misaOrderRepository.findOne({
        where: { id: requisition.misaOrderId },
      });

      if (!misaOrder) {
        this.warn(`Không tìm thấy misaOrder ${requisition.misaOrderId}`);
        return;
      }

      // Tìm tất cả employees có permission 'approve_purchase_orders' trong factory này
      let creators = await this.employeeRepository
        .createQueryBuilder('employee')
        .where('employee.factoryId = :factoryId', {
          factoryId: requisition.factoryId,
        })
        .leftJoinAndSelect('employee.user', 'user')
        .leftJoinAndSelect('employee.roleGroups', 'roleGroups')
        .getMany();
      
      // Filter by merged permissions (from roleGroups + permissions cũ)
      creators = creators.filter(emp => hasEmployeePermission(emp, 'approve_purchase_orders'));

      if (creators.length === 0) {
        this.warn(
          'Không có nhân viên nào có quyền approve_purchase_orders trong factory này',
        );
        return;
      }

      // Gửi thông báo cho từng creator
      const notifications = creators
        .filter((emp) => emp.userId)
        .map((emp) =>
          this.notificationService.sendNotificationToUser(
            emp.userId!,
            `Đề xuất mua hàng đã được duyệt: ${requisition.requisitionNumber}`,
            `Đơn hàng: ${misaOrder.orderNumber}\nKhách hàng: ${misaOrder.customerName || 'Không xác định'}\nVui lòng tạo đơn mua hàng.\nNhấn để xem chi tiết`,
            NOTIFICATION_TYPE.PURCHASE_REQUISITION_APPROVED,
            requisition.id,
            {
              requisitionNumber: requisition.requisitionNumber,
              orderNumber: misaOrder.orderNumber,
              customerName: misaOrder.customerName,
            },
          ),
        );

      const results = await Promise.allSettled(notifications);
      const sent = results.filter((r) => r.status === 'fulfilled').length;

      this.log(
        `Gửi ${sent}/${creators.length} thông báo đề xuất đã duyệt cho purchase order creators`,
      );
    } catch (error) {
      this.error('Lỗi gửi thông báo cho purchase order creators', error);
    }
  }

  /**
   * Gửi thông báo cho người tạo đề xuất khi yêu cầu chỉnh sửa
   */
  private async notifyCreatorForRevision(
    requisition: PurchaseRequisition,
    reason: string,
    requestedBy: Employee,
  ) {
    try {
      const creatorUserId = requisition.createdBy?.userId;

      if (!creatorUserId) {
        this.warn(`Không tìm thấy userId của người tạo đề xuất ${requisition.id}`);
        return;
      }

      const requestedByName = requestedBy.user?.fullName || 'Người duyệt';

      await this.notificationService.sendNotificationToUser(
        creatorUserId,
        `Đề xuất mua hàng cần chỉnh sửa: ${requisition.requisitionNumber}`,
        `${requestedByName} yêu cầu chỉnh sửa.\nLý do: ${reason}\nNhấn để xem chi tiết và gửi lại.`,
        NOTIFICATION_TYPE.PURCHASE_REQUISITION_REVISION_REQUIRED,
        requisition.id,
        {
          requisitionNumber: requisition.requisitionNumber,
          revisionReason: reason,
          requestedByName,
        },
      );

      this.log(`Gửi thông báo yêu cầu chỉnh sửa đề xuất ${requisition.requisitionNumber} cho người tạo`);
    } catch (error) {
      this.error('Lỗi gửi thông báo yêu cầu chỉnh sửa cho người tạo', error);
    }
  }

  /**
   * Gửi thông báo cho người tạo đề xuất khi được duyệt hoặc từ chối
   */
  private async notifyCreatorOnApprovalOrRejection(
    requisition: PurchaseRequisition,
    approved: boolean,
    approverName: string,
    note?: string,
  ) {
    try {
      // Load creator if not already loaded
      let creator: Employee | null | undefined = requisition.createdBy;
      if (!creator || !creator.userId) {
        creator = await this.employeeRepository.findOne({
          where: { id: requisition.createdByEmployeeId },
          relations: ['user'],
        });
      }

      if (!creator || !creator.userId) {
        this.warn(`Không tìm thấy userId của người tạo đề xuất ${requisition.id}`);
        return;
      }

      const title = approved
        ? `Đề xuất mua hàng đã được duyệt: ${requisition.requisitionNumber}`
        : `Đề xuất mua hàng bị từ chối: ${requisition.requisitionNumber}`;

      const bodyParts = [
        approved ? `Đề xuất đã được ${approverName} duyệt.` : `Đề xuất bị ${approverName} từ chối.`,
      ];

      if (note) {
        bodyParts.push(`Ghi chú: ${note}`);
      }

      bodyParts.push('Nhấn để xem chi tiết.');

      const notificationType = approved
        ? NOTIFICATION_TYPE.PURCHASE_REQUISITION_APPROVED
        : NOTIFICATION_TYPE.PURCHASE_REQUISITION_REJECTED;

      await this.notificationService.sendNotificationToUser(
        creator.userId,
        title,
        bodyParts.join('\n'),
        notificationType,
        requisition.id,
        {
          requisitionNumber: requisition.requisitionNumber,
          approved,
          approverName,
          note,
        },
      );

      this.log(
        `Gửi thông báo ${approved ? 'duyệt' : 'từ chối'} đề xuất ${requisition.requisitionNumber} cho người tạo`,
      );
    } catch (error) {
      this.error('Lỗi gửi thông báo duyệt/từ chối cho người tạo', error);
    }
  }

  /**
   * Gửi thông báo cho những người có quyền duyệt khi đề xuất được gửi lại
   */
  private async notifyRequisitionApproversForResubmit(
    requisition: PurchaseRequisition,
    misaOrder: MisaOrder,
  ) {
    try {
      // Query employees có permission 'approve_purchase_requisition' trong factory này
      let approvers = await this.employeeRepository
        .createQueryBuilder('employee')
        .where('employee.factoryId = :factoryId', {
          factoryId: requisition.factoryId,
        })
        .leftJoinAndSelect('employee.user', 'user')
        .leftJoinAndSelect('employee.roleGroups', 'roleGroups')
        .getMany();
      
      // Filter by merged permissions (from roleGroups + permissions cũ)
      approvers = approvers.filter(emp => hasEmployeePermission(emp, 'approve_purchase_requisition'));

      if (approvers.length === 0) {
        this.warn(
          'Không có nhân viên nào có quyền approve_purchase_requisition trong factory này',
        );
        return;
      }

      // Gửi thông báo cho từng approver
      const notifications = approvers
        .filter((emp) => emp.userId)
        .map((emp) =>
          this.notificationService.sendNotificationToUser(
            emp.userId!,
            `Đề xuất đã được gửi lại: ${requisition.requisitionNumber}`,
            `Đơn hàng: ${misaOrder.orderNumber}\nKhách hàng: ${misaOrder.customerName || 'Không xác định'}\nĐề xuất đã được chỉnh sửa và gửi lại. Nhấn để xem chi tiết.`,
            NOTIFICATION_TYPE.PURCHASE_REQUISITION_RESUBMITTED,
            requisition.id,
            {
              requisitionNumber: requisition.requisitionNumber,
              orderNumber: misaOrder.orderNumber,
              customerName: misaOrder.customerName,
            },
          ),
        );

      const results = await Promise.allSettled(notifications);
      const sent = results.filter((r) => r.status === 'fulfilled').length;

      this.log(
        `Gửi ${sent}/${approvers.length} thông báo đề xuất gửi lại cho approvers`,
      );
    } catch (error) {
      this.error('Lỗi gửi thông báo đề xuất gửi lại cho approvers', error);
    }
  }

  /**
   * Gửi thông báo cho những người có quyền tạo đơn mua hàng khi DXMH được auto approve từ đơn bán hàng
   */
  private async notifyPurchaseOrderCreatorsForAutoApproved(
    requisition: PurchaseRequisition,
    misaSaOrder: MisaSaOrder | null,
  ) {
    try {
      // Tìm tất cả employees có permission 'approve_purchase_orders' trong factory này
      let creators = await this.employeeRepository
        .createQueryBuilder('employee')
        .where('employee.factoryId = :factoryId', {
          factoryId: requisition.factoryId,
        })
        .leftJoinAndSelect('employee.user', 'user')
        .leftJoinAndSelect('employee.roleGroups', 'roleGroups')
        .getMany();

      // Filter by merged permissions (from roleGroups + permissions cũ)
      creators = creators.filter(emp =>
        hasEmployeePermission(emp, 'approve_purchase_orders'),
      );

      if (creators.length === 0) {
        this.warn(
          'Không có nhân viên nào có quyền approve_purchase_orders trong factory này',
        );
        return;
      }

      // Build thông tin đơn hàng
      let orderInfo = 'Đề xuất mua hàng';
      let orderNumber = 'N/A';
      let customerName: string | undefined = undefined;

      if (misaSaOrder) {
        orderInfo = `Đơn bán hàng: ${misaSaOrder.refNo}\nKhách hàng: ${misaSaOrder.accountObjectName || 'Không xác định'}`;
        orderNumber = misaSaOrder.refNo;
        customerName = misaSaOrder.accountObjectName || undefined;
      }

      // Gửi thông báo cho từng creator
      const notifications = creators
        .filter((emp) => emp.userId)
        .map((emp) =>
          this.notificationService.sendNotificationToUser(
            emp.userId!,
            `Đề xuất mua hàng đã được duyệt: ${requisition.requisitionNumber}`,
            `${orderInfo}\n(Tự động duyệt từ đơn bán hàng)\nVui lòng tạo đơn mua hàng.\nNhấn để xem chi tiết`,
            NOTIFICATION_TYPE.PURCHASE_REQUISITION_APPROVED,
            requisition.id,
            {
              requisitionNumber: requisition.requisitionNumber,
              orderNumber: orderNumber,
              customerName: customerName,
              isAutoApproved: true,
            },
          ),
        );

      const results = await Promise.allSettled(notifications);
      const sent = results.filter((r) => r.status === 'fulfilled').length;

      this.log(
        `Gửi ${sent}/${creators.length} thông báo đề xuất auto-approve cho purchase order creators`,
      );
    } catch (error) {
      this.error('Lỗi gửi thông báo auto-approve cho purchase order creators', error);
    }
  }

  /**
   * Gửi thông báo khi đề xuất mua hàng được xác nhận đã mua
   * - Gửi cho người tạo đề xuất
   * - Gửi cho người duyệt đề xuất (BGĐ)
   */
  private async notifyPurchaseConfirmed(
    requisition: PurchaseRequisition,
    confirmerName: string,
    notes?: string,
  ) {
    try {
      const usersToNotify: number[] = [];

      // Người tạo đề xuất
      if (requisition.createdBy?.userId) {
        usersToNotify.push(requisition.createdBy.userId);
      }

      // Người duyệt đề xuất (BGĐ)
      if (requisition.approvedBy?.userId && requisition.approvedBy.userId !== requisition.createdBy?.userId) {
        usersToNotify.push(requisition.approvedBy.userId);
      }

      if (usersToNotify.length === 0) {
        this.warn(`Không tìm thấy user để gửi thông báo xác nhận mua hàng cho đề xuất ${requisition.id}`);
        return;
      }

      // Build thông tin đơn hàng
      let orderInfo = '';
      if (requisition.misaOrder) {
        orderInfo = `Đơn hàng: ${requisition.misaOrder.orderNumber}`;
      } else if (requisition.misaSaOrder) {
        orderInfo = `Đơn bán hàng: ${requisition.misaSaOrder.refNo}`;
      }

      const bodyParts = [
        `${confirmerName} đã xác nhận mua hàng cho đề xuất này.`,
      ];

      if (orderInfo) {
        bodyParts.push(orderInfo);
      }

      if (notes) {
        bodyParts.push(`Ghi chú: ${notes}`);
      }

      bodyParts.push('Nhấn để xem chi tiết.');

      // Gửi thông báo cho từng user
      const notifications = usersToNotify.map((userId) =>
        this.notificationService.sendNotificationToUser(
          userId,
          `Đề xuất mua hàng đã được xác nhận: ${requisition.requisitionNumber}`,
          bodyParts.join('\n'),
          NOTIFICATION_TYPE.PURCHASE_REQUISITION_PURCHASE_CONFIRMED,
          requisition.id,
          {
            requisitionNumber: requisition.requisitionNumber,
            confirmerName,
            notes,
          },
        ),
      );

      const results = await Promise.allSettled(notifications);
      const sent = results.filter((r) => r.status === 'fulfilled').length;

      this.log(
        `Gửi ${sent}/${usersToNotify.length} thông báo xác nhận mua hàng cho đề xuất ${requisition.requisitionNumber}`,
      );
    } catch (error) {
      this.error('Lỗi gửi thông báo xác nhận mua hàng', error);
    }
  }
}
