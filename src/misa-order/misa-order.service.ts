import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { MisaOrder } from './entities/misa-order.entity';
import { MisaOrderItem } from './entities/misa-order-item.entity';
import { OrderAssignment } from './entities/order-assignment.entity';
import { Employee } from 'src/employee/entities/employee.entity';
import { Department } from 'src/deparments/entities/deparment.entity';
import { CreateMisaOrderDto } from './dto/create-misa-order.dto';
import { ApproveMisaOrderDto } from './dto/approve-misa-order.dto';
import { AssignMisaOrderDto } from './dto/assign-misa-order.dto';
import { UpdateMisaOrderStatusDto } from './dto/update-misa-order-status.dto';
import { NotificationService } from 'src/notification/notification.service';
import { NOTIFICATION_TYPE } from 'src/notification/constants/notification-type.constant';
import {
  throwBadRequestError,
  throwNotFoundError,
  throwForbiddenError,
} from 'src/utils/error.helper';
import { PurchaseRequisitionService } from 'src/purchase-requisition/purchase-requisition.service';
import { hasEmployeePermission, mergeEmployeePermissions } from 'src/utils/employee-permissions.helper';

@Injectable()
export class MisaOrderService {
  private readonly context = 'MisaOrderService';

  constructor(
    @InjectRepository(MisaOrder)
    private readonly misaOrderRepository: Repository<MisaOrder>,
    @InjectRepository(MisaOrderItem)
    private readonly misaOrderItemRepository: Repository<MisaOrderItem>,
    @InjectRepository(OrderAssignment)
    private readonly orderAssignmentRepository: Repository<OrderAssignment>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly notificationService: NotificationService,
    @Inject(forwardRef(() => PurchaseRequisitionService))
    private readonly purchaseRequisitionService: PurchaseRequisitionService,
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

  /**
   * Tạo đơn đặt hàng mới (chỉ employee_gtg)
   * Gửi thông báo cho phòng ban Giám Đốc và Phó Giám Đốc
   */
  async create(dto: CreateMisaOrderDto, createdByEmployeeId: number) {
    // Validate items không trống
    if (!dto.items || dto.items.length === 0) {
      throwBadRequestError('Đơn hàng phải có ít nhất 1 sản phẩm');
    }

    // Tạo misa order
    const misaOrder = this.misaOrderRepository.create() as MisaOrder;
    misaOrder.orderNumber = dto.orderNumber;
    misaOrder.orderDate = new Date(dto.orderDate);
    misaOrder.customerName = dto.customerName;
    misaOrder.customerPhone = dto.customerPhone;
    misaOrder.customerAddress = dto.customerAddress;
    misaOrder.customerTaxCode = dto.customerTaxCode;
    misaOrder.createdByEmployeeId = createdByEmployeeId;
    misaOrder.factoryId = dto.factoryId;
    misaOrder.status = 'pendingApproval';

    const savedOrder = (await this.misaOrderRepository.save(
      misaOrder
    )) as unknown as MisaOrder;

    // Tạo items
    const items = dto.items.map(item =>
      this.misaOrderItemRepository.create({
        misaOrderId: savedOrder.id,
        productCode: item.productCode,
        productName: item.productName,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        notes: item.notes,
      })
    );

    await this.misaOrderItemRepository.save(items);

    // Gửi thông báo cho phòng ban Giám Đốc và Phó Giám Đốc
    await this.notifyCreateOrderNotification(savedOrder);

    // Load lại với relations
    return this.findOne(savedOrder.id);
  }

  /**
   * Lấy chi tiết đơn hàng
   */
  async findOne(id: number) {
    // Dùng QueryBuilder để order assignments theo thời gian
    const found = await this.misaOrderRepository
      .createQueryBuilder('order')
      .where('order.id = :id', { id })
      .leftJoinAndSelect('order.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.user', 'createdByUser')
      .leftJoinAndSelect('order.approvedBy', 'approvedBy')
      .leftJoinAndSelect('approvedBy.user', 'approvedByUser')
      .leftJoinAndSelect('order.assignedTo', 'assignedTo')
      .leftJoinAndSelect('assignedTo.user', 'assignedToUser')
      .leftJoinAndSelect('order.completedBy', 'completedBy')
      .leftJoinAndSelect('completedBy.user', 'completedByUser')
      .leftJoinAndSelect(
        'order.orderReceivedConfirmedBy',
        'orderReceivedConfirmedBy'
      )
      .leftJoinAndSelect(
        'orderReceivedConfirmedBy.user',
        'orderReceivedConfirmedByUser'
      )
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.factory', 'factory')
      .leftJoinAndSelect('order.assignments', 'assignments')
      .leftJoinAndSelect('assignments.employee', 'assignmentEmployee')
      .leftJoinAndSelect('assignmentEmployee.user', 'assignmentEmployeeUser')
      .leftJoinAndSelect('assignments.assignedBy', 'assignedBy')
      .leftJoinAndSelect('assignedBy.user', 'assignedByUser')
      // Sắp xếp assignments theo thời gian từ cũ đến mới
      .orderBy('assignments.assignedAt', 'ASC')
      .addOrderBy('assignments.id', 'ASC') // Thêm id để đảm bảo consistent ordering
      .getOne();

    if (!found) {
      throwNotFoundError('Không tìm thấy đơn đặt hàng');
    }

    return found;
  }

  /**
   * Tìm đơn hàng theo orderNumber
   */
  async findByOrderNumber(orderNumber: string) {
    return this.misaOrderRepository.findOne({
      where: { orderNumber },
      relations: ['items'],
    });
  }

  /**
   * Update đơn hàng từ email (chỉ update info và items, không đổi status)
   */
  async updateFromEmail(orderId: number, dto: CreateMisaOrderDto) {
    try {
      // Load order với items để so sánh
      const order = await this.misaOrderRepository.findOne({
        where: { id: orderId },
        relations: ['items'],
      });

      if (!order) {
        throwNotFoundError('Không tìm thấy đơn đặt hàng');
      }

      // Lưu thông tin cũ để so sánh
      const oldData = {
        orderDate: order.orderDate,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerAddress: order.customerAddress,
        items: order.items ? [...order.items] : [],
      };

      // Phát hiện các thay đổi
      const changes = this.detectOrderChanges(oldData, dto);

      // XÓA items cũ TRƯỚC (để tránh TypeORM cố gắng set misaOrderId = null)
      await this.misaOrderItemRepository.delete({ misaOrderId: order.id });

      // Clear items từ order entity để TypeORM không track
      order.items = [];

      // Update order info (giữ nguyên status, createdBy, approvedBy, assignedTo)
      order.orderDate = new Date(dto.orderDate);
      order.customerName = dto.customerName;
      order.customerPhone = dto.customerPhone;
      order.customerAddress = dto.customerAddress;
      order.customerTaxCode = dto.customerTaxCode;
      order.factoryId = dto.factoryId;

      await this.misaOrderRepository.save(order);

      // Tạo items mới
      const items = dto.items.map(item =>
        this.misaOrderItemRepository.create({
          misaOrderId: order.id,
          productCode: item.productCode,
          productName: item.productName,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          notes: item.notes,
        })
      );

      await this.misaOrderItemRepository.save(items);

      // Nếu đơn đã duyệt → GỬI NOTIFICATION (dù có thay đổi gì)
      const isApproved =
        order.status !== 'pendingApproval' &&
        order.status !== 'pending_approval';
      if (isApproved) {
        this.log(
          `Order ${order.orderNumber} updated from email - Changes: ${changes.length} field(s)`
        );

        // Load lại order với đầy đủ relations để gửi notification
        const updatedOrder = await this.findOne(order.id);
        await this.notifyOrderUpdatedFromEmail(updatedOrder, changes);
      }

      // Load lại với relations
      return this.findOne(order.id);
    } catch (error) {
      this.error(`❌ Error in updateFromEmail for order ID ${orderId}`, error);
      throw error;
    }
  }

  /**
   * Phát hiện tất cả thay đổi trong đơn hàng
   */
  private detectOrderChanges(oldData: any, newData: any): string[] {
    const changes: string[] = [];

    try {
      // 1. Kiểm tra ngày đơn hàng
      if (oldData.orderDate && newData.orderDate) {
        try {
          const oldDate = new Date(oldData.orderDate).toLocaleDateString(
            'vi-VN'
          );
          const newDate = new Date(newData.orderDate).toLocaleDateString(
            'vi-VN'
          );
          if (
            oldDate !== newDate &&
            oldDate !== 'Invalid Date' &&
            newDate !== 'Invalid Date'
          ) {
            changes.push(`Ngày đơn hàng: ${oldDate} → ${newDate}`);
          }
        } catch (error) {
          this.warn('Error comparing order dates');
        }
      }

      // 2. Kiểm tra tên khách hàng
      if (oldData.customerName !== newData.customerName) {
        changes.push(
          `Tên khách hàng: ${oldData.customerName || '-'} → ${
            newData.customerName || '-'
          }`
        );
      }

      // 3. Kiểm tra số điện thoại
      if (oldData.customerPhone !== newData.customerPhone) {
        changes.push(
          `Số điện thoại: ${oldData.customerPhone || '-'} → ${
            newData.customerPhone || '-'
          }`
        );
      }

      // 4. Kiểm tra địa chỉ
      if (oldData.customerAddress !== newData.customerAddress) {
        changes.push(
          `Địa chỉ: ${oldData.customerAddress || '-'} → ${
            newData.customerAddress || '-'
          }`
        );
      }

      // 5. Kiểm tra số lượng items
      const oldItemsCount = oldData.items?.length || 0;
      const newItemsCount = newData.items?.length || 0;
      if (oldItemsCount !== newItemsCount) {
        changes.push(`Số sản phẩm: ${oldItemsCount} → ${newItemsCount}`);
      }

      // 6. Kiểm tra chi tiết items (nếu số lượng giống nhau)
      if (oldItemsCount > 0 && oldItemsCount === newItemsCount) {
        for (let i = 0; i < oldItemsCount; i++) {
          const oldItem = oldData.items[i];
          const newItem = newData.items[i];

          if (
            oldItem.productCode !== newItem.productCode ||
            oldItem.productName !== newItem.productName ||
            oldItem.unit !== newItem.unit ||
            oldItem.quantity !== newItem.quantity
          ) {
            changes.push('Chi tiết sản phẩm đã thay đổi');
            break; // Chỉ thông báo 1 lần
          }
        }
      }
    } catch (error) {
      this.error('Error detecting order changes', error);
    }

    return changes;
  }

  /**
   * Lấy danh sách đơn hàng theo factory (với pagination và filter)
   */
  async findAllByFactory(factoryId: number, query?: any) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { factoryId };

    // Filter by status
    if (query?.status) {
      where.status = query.status;
    }

    // Filter by date range
    if (query?.startDate && query?.endDate) {
      where.orderDate = Between(
        new Date(query.startDate),
        new Date(query.endDate + 'T23:59:59') // End of day
      );
    }

    const [data, total] = await this.misaOrderRepository.findAndCount({
      where,
      relations: [
        'createdBy',
        'createdBy.user',
        'approvedBy',
        'approvedBy.user',
        'assignedTo',
        'assignedTo.user',
        'items',
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
   * Lấy danh sách đơn chờ duyệt (cho Giám Đốc/Phó Giám Đốc)
   */
  async findPendingApproval(factoryId: number) {
    return this.misaOrderRepository.find({
      where: {
        factoryId,
        status: 'pending_approval',
      },
      relations: ['createdBy', 'createdBy.user', 'items'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Lấy danh sách đơn được giao cho mình
   */
  async findAssignedToMe(employeeId: number) {
    return this.misaOrderRepository.find({
      where: {
        assignedToEmployeeId: employeeId,
      },
      relations: [
        'createdBy',
        'createdBy.user',
        'approvedBy',
        'approvedBy.user',
        'items',
        'factory',
      ],
      order: { assignedAt: 'DESC' },
    });
  }

  /**
   * Duyệt đơn hàng (chỉ người có quyền approve_orders)
   */
  async approve(
    id: number,
    dto: ApproveMisaOrderDto,
    approvedByEmployeeId: number | null
  ) {
    // Check permission nếu không phải SuperAdmin
    if (approvedByEmployeeId !== null) {
      const employee = await this.employeeRepository.findOne({
        where: { id: approvedByEmployeeId },
        relations: ['roleGroups'],
      });

      if (!employee) {
        throwNotFoundError('Không tìm thấy thông tin nhân viên');
      }

      // Check permission từ roleGroups + permissions cũ
      if (!hasEmployeePermission(employee, 'approve_orders')) {
        throwForbiddenError('Bạn không có quyền duyệt đơn hàng');
      }
    }

    // Chỉ load order không load items để tránh cascade update
    const order = await this.misaOrderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throwNotFoundError('Không tìm thấy đơn đặt hàng');
    }

    if (
      order.status !== 'pendingApproval' &&
      order.status !== 'pending_approval'
    ) {
      throwBadRequestError('Chỉ có thể duyệt đơn ở trạng thái chờ duyệt');
    }

    // Update status
    order.status = 'approved';
    order.approvedByEmployeeId = approvedByEmployeeId;
    order.approvedAt = new Date();

    // Tự động chuyển sang bước kiểm tra hàng tồn
    order.currentStep = 'inventory_check';

    // Lưu notes nếu có
    if (dto.notes) {
      order.notes = dto.notes;
    }

    await this.misaOrderRepository.save(order);

    // Gửi thông báo cho phòng ban nếu được chọn
    if (dto.notifyDepartmentId) {
      await this.notifyDepartmentAboutApprovedOrder(
        order,
        dto.notifyDepartmentId,
        dto.notifyTeamId
      );
    }

    return this.findOne(id);
  }

  /**
   * Assign đơn hàng cho nhân viên (chỉ Giám Đốc/Phó Giám Đốc)
   */
  async assign(
    id: number,
    dto: AssignMisaOrderDto,
    assignedByEmployeeId: number | null
  ) {
    // Chỉ load order không load items để tránh cascade update
    const order = await this.misaOrderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throwNotFoundError('Không tìm thấy đơn đặt hàng');
    }

    // Cho phép assign nhiều lần cho workflow (approved, assigned, processing)
    const allowedStatuses = ['approved', 'assigned', 'processing'];
    if (!allowedStatuses.includes(order.status)) {
      throwBadRequestError(
        'Không thể giao việc đơn hàng với trạng thái hiện tại'
      );
    }

    // Validate: Phải hoàn thành kiểm tra hàng tồn trước khi assign
    if (order.currentStep === 'inventory_check') {
      throwBadRequestError(
        'Vui lòng hoàn thành kiểm tra hàng tồn trước khi giao việc'
      );
    }

    // Support both old (single) and new (array) format
    let employeeIdsToAssign: number[];

    const step = dto.step || 'general';

    if (dto.assignedToEmployeeIds && dto.assignedToEmployeeIds.length > 0) {
      // New format: array of employee ids
      employeeIdsToAssign = dto.assignedToEmployeeIds;
    } else if (dto.assignedToEmployeeId) {
      // Old format: single employee id
      employeeIdsToAssign = [dto.assignedToEmployeeId];
    } else if (step === 'shipping_company' && assignedByEmployeeId) {
      // Nếu giao cho công ty vận chuyển và không chọn nhân viên cụ thể
      // → Tự động assign cho nhân viên đang thực hiện
      employeeIdsToAssign = [assignedByEmployeeId];
      this.log(
        `Auto-assign shipping_company step to current employee: ${assignedByEmployeeId}`
      );
    } else {
      throwBadRequestError('Vui lòng chọn ít nhất một nhân viên để giao việc');
    }

    // Validate tất cả nhân viên tồn tại
    const employees = await this.employeeRepository.find({
      where: employeeIdsToAssign.map(id => ({ id })),
      relations: ['user'],
    });

    if (employees.length !== employeeIdsToAssign.length) {
      throwBadRequestError('Một hoặc nhiều nhân viên không tồn tại');
    }

    // Tính revision: Tìm revision cao nhất của step này + 1
    const maxRevisionResult = await this.orderAssignmentRepository
      .createQueryBuilder('assignment')
      .select('MAX(assignment.revision)', 'maxRevision')
      .where('assignment.orderId = :orderId', { orderId: order.id })
      .andWhere('assignment.step = :step', { step })
      .getRawOne();

    const nextRevision = (maxRevisionResult?.maxRevision || 0) + 1;

    // Tạo assignments cho tất cả nhân viên trong step này
    const assignments = employeeIdsToAssign.map(employeeId => {
      const assignment = this.orderAssignmentRepository.create({
        orderId: order.id,
        employeeId,
        step,
        revision: nextRevision,
        assignedByEmployeeId,
        notes: dto.notes,
        shippingCompanyName: dto.shippingCompanyName,
        shippingCompanyPhone: dto.shippingCompanyPhone,
        shippingCompanyAddress: dto.shippingCompanyAddress,
        trackingNumber: dto.trackingNumber,
        photoUrls: dto.photoUrls || undefined,
      });
      return assignment;
    });

    await this.orderAssignmentRepository.save(assignments);

    // Update order status và currentStep
    if (order.status === 'approved') {
      order.status = 'assigned';
      order.assignedAt = new Date();
    }

    order.currentStep = step;
    order.assignedToEmployeeId = employeeIdsToAssign[0]; // Để tương thích với code cũ

    await this.misaOrderRepository.save(order);

    // Gửi thông báo cho nhân viên được assign + người có quyền duyệt
    await this.notifyAssignedEmployees(order, employees, step, nextRevision);

    return this.findOne(id);
  }

  /**
   * Cập nhật ghi chú đơn hàng (dành cho phòng kinh doanh xác nhận số lượng)
   */
  async updateNotes(id: number, notes: string, employeeId: number | null) {
    const order = await this.misaOrderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throwNotFoundError('Không tìm thấy đơn đặt hàng');
    }

    // Kiểm tra quyền: Người có quyền view_all_orders hoặc người được assign
    if (employeeId !== null) {
      const employee = await this.employeeRepository.findOne({
        where: { id: employeeId },
        relations: ['roleGroups'],
      });

      if (!employee) {
        throwNotFoundError('Không tìm thấy thông tin nhân viên');
      }

      // Check permission từ roleGroups + permissions cũ
      const hasViewAllPermission = hasEmployeePermission(employee, 'view_all_orders');
      const isAssigned = order.assignedToEmployeeId === employeeId;

      if (!hasViewAllPermission && !isAssigned) {
        throwForbiddenError('Bạn không có quyền cập nhật ghi chú đơn hàng này');
      }
    }

    order.notes = notes;
    await this.misaOrderRepository.save(order);

    return this.findOne(id);
  }

  /**
   * Cập nhật trạng thái đơn hàng (processing, completed, cancelled)
   */
  async updateStatus(
    id: number,
    dto: UpdateMisaOrderStatusDto,
    employeeId: number | null
  ) {
    // Chỉ load order không load items để tránh cascade update
    const order = await this.misaOrderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throwNotFoundError('Không tìm thấy đơn đặt hàng');
    }

    // Validate quyền: chỉ người được assign hoặc người tạo mới được update (hoặc superAdmin)
    if (employeeId !== null) {
      if (
        order.assignedToEmployeeId !== employeeId &&
        order.createdByEmployeeId !== employeeId
      ) {
        throwBadRequestError('Bạn không có quyền cập nhật đơn hàng này');
      }
    }

    // Validate trạng thái
    if (dto.status === 'processing' && order.status !== 'assigned') {
      throwBadRequestError(
        'Chỉ có thể chuyển sang processing khi đơn đã được assign'
      );
    }

    order.status = dto.status;

    await this.misaOrderRepository.save(order);

    return this.findOne(id);
  }

  /**
   * Hoàn thành đơn hàng (khi ở bước installation)
   * Lưu thông tin người hoàn thành đơn hàng
   */
  async complete(id: number, employeeId: number | null, notes?: string) {
    const order = await this.misaOrderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throwNotFoundError('Không tìm thấy đơn đặt hàng');
    }

    // Validate: phải đang ở bước installation
    if (order.currentStep !== 'installation') {
      throwBadRequestError(
        'Chỉ có thể hoàn thành đơn hàng khi đang ở bước lắp đặt (installation)'
      );
    }

    // Validate: status phải là approved, assigned, hoặc processing
    if (!['approved', 'assigned', 'processing'].includes(order.status)) {
      throwBadRequestError(
        'Không thể hoàn thành đơn hàng với trạng thái hiện tại'
      );
    }

    // Cập nhật trạng thái thành completed
    order.status = 'completed';
    order.completedByEmployeeId = employeeId;
    order.completedAt = new Date();

    // Note: notes parameter is accepted but not saved to order
    // Could be saved to OrderAssignment if needed in the future

    await this.misaOrderRepository.save(order);

    return this.findOne(id);
  }

  /**
   * Hoàn thành kiểm tra hàng tồn (Phòng kinh doanh)
   */
  async completeInventoryCheck(
    id: number,
    employeeId: number | null,
    notes?: string,
    needsOrder?: boolean,
    notifyEmployeeId?: number
  ) {
    const order = await this.misaOrderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throwNotFoundError('Không tìm thấy đơn đặt hàng');
    }

    // Validate: phải đang ở bước inventory_check
    if (order.currentStep !== 'inventory_check') {
      throwBadRequestError('Đơn hàng không ở bước kiểm tra hàng tồn');
    }

    // Validate: status phải là approved
    if (order.status !== 'approved') {
      throwBadRequestError(
        'Không thể hoàn thành kiểm tra với trạng thái hiện tại'
      );
    }

    // Cập nhật thông tin kiểm tra hàng tồn
    order.inventoryCheckedByEmployeeId = employeeId;
    order.inventoryCheckedAt = new Date();

    // Lưu notes nếu có (ghi chú về hàng tồn, cần mua thêm gì)
    if (notes) {
      order.notes = notes;
    }

    // Xử lý theo needsOrder
    if (needsOrder === true) {
      // Tìm tất cả employees có quyền approve_purchase_requisition trong factory
      let approvers = await this.employeeRepository
        .createQueryBuilder('employee')
        .where('employee.factoryId = :factoryId', {
          factoryId: order.factoryId,
        })
        .leftJoinAndSelect('employee.roleGroups', 'roleGroups')
        .getMany();
      
      // Filter by merged permissions (from roleGroups + permissions cũ)
      approvers = approvers.filter(emp => hasEmployeePermission(emp, 'approve_purchase_requisition'));

      // Tạo assignment cho tất cả employees có quyền approve_purchase_requisition
      if (approvers.length > 0) {
        const assignments = approvers.map(approver =>
          this.orderAssignmentRepository.create({
            orderId: id,
            employeeId: approver.id,
            step: 'pending_order',
            revision: 1,
            assignedByEmployeeId: employeeId,
            notes: notes || 'Cần đặt hàng',
            assignedAt: new Date(),
          })
        );

        await this.orderAssignmentRepository.save(assignments);
        this.log(
          `Đã tạo ${assignments.length} assignment cho đơn hàng ${order.orderNumber}`
        );
      } else {
        this.warn(
          `Không tìm thấy employee có quyền approve_purchase_requisition trong factory ${order.factoryId}`
        );
      }

      // Đặt currentStep = 'pending_order' để đơn hàng ở trạng thái chờ đặt hàng
      order.currentStep = 'pending_order';
      order.status = 'pending_order'; // Thêm status mới

      // TẠO ĐỀ XUẤT MUA HÀNG (Purchase Requisition)
      // Gửi thông báo cho những người có quyền "approve_purchase_requisition"
      // Truyền approvers để tránh query lại trong purchaseRequisitionService
      try {
        await this.purchaseRequisitionService.create(
          {
            misaOrderId: id,
            notes: notes || 'Cần đặt hàng',
            requisitionNumber: order.orderNumber,
          },
          employeeId!,
          order.factoryId,
          approvers // Truyền approvers đã query ở trên
        );
        this.log(`Đã tạo đề xuất mua hàng cho đơn hàng ${order.orderNumber}`);
      } catch (error) {
        this.error('Lỗi tạo đề xuất mua hàng', error);
        // Không throw error để không ảnh hưởng đến việc hoàn thành kiểm tra hàng tồn
      }
    } else {
      // Không cần đặt hàng: clear currentStep để có thể assign các bước khác
      order.currentStep = null;
    }

    await this.misaOrderRepository.save(order);

    // Gửi notification sau khi save order
    // Chỉ gọi khi needsOrder = false (hàng tồn đủ)
    // Khi needsOrder = true, notification đã được gửi trong purchaseRequisitionService.create -> notifyRequisitionApprovers
    if (!needsOrder) {
      await this.notifyNoNeedToOrder(order);
    }

    return this.findOne(id);
  }

  /**
   * Xác nhận hàng về (chuyển từ pending_order về approved)
   */
  async confirmOrderReceived(id: number, employeeId: number | null) {
    const order = await this.misaOrderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throwNotFoundError('Không tìm thấy đơn đặt hàng');
    }

    // Validate: phải đang ở bước pending_order
    if (order.currentStep !== 'pending_order') {
      throwBadRequestError('Đơn hàng không ở trạng thái chờ đặt hàng');
    }

    // Validate: status phải là pending_order
    if (order.status !== 'pending_order') {
      throwBadRequestError(
        'Không thể xác nhận hàng về với trạng thái hiện tại'
      );
    }

    // Chuyển về trạng thái approved để có thể assign các bước tiếp theo
    order.status = 'approved';
    order.currentStep = null; // Clear currentStep để có thể assign

    // Lưu thông tin người xác nhận hàng về
    if (employeeId) {
      order.orderReceivedConfirmedByEmployeeId = employeeId;
      order.orderReceivedConfirmedAt = new Date();
    }

    await this.misaOrderRepository.save(order);

    // Gửi notification cho users có quyền approve
    await this.notifyOrderReceivedConfirmed(order);

    return this.findOne(id);
  }

  /**
   * Xóa mềm đơn hàng
   */
  async softDelete(id: number) {
    // Chỉ load order không load items để tránh cascade update
    const order = await this.misaOrderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throwNotFoundError('Không tìm thấy đơn đặt hàng');
    }

    // Chỉ cho phép xóa đơn ở trạng thái pending_approval hoặc cancelled
    if (
      !['pendingApproval', 'pending_approval', 'cancelled'].includes(
        order.status
      )
    ) {
      throwBadRequestError('Không thể xóa đơn đã được duyệt hoặc đang xử lý');
    }

    // Chỉ soft delete order, items vẫn giữ nguyên
    return this.misaOrderRepository.softDelete(id);
  }

  /**
   * Lấy danh sách đơn hàng dựa trên permissions (for mobile)
   * Logic:
   * - Nếu có permission 'view_all_orders': Xem TẤT CẢ đơn trong factory
   * - Nếu không: Chỉ xem đơn được assign cho mình
   */
  async findOrdersByPermissions(
    employeeId: number,
    filters?: {
      page?: number;
      limit?: number;
      status?: string;
      step?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    }
  ) {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
      relations: ['roleGroups'],
    });

    if (!employee) {
      return [];
    }

    // Check permission từ roleGroups + permissions cũ
    const hasViewAllPermission = hasEmployeePermission(employee, 'view_all_orders');

    this.log(`findOrdersByPermissions - Employee ${employeeId}`);
    this.log(`Has view_all_orders permission: ${hasViewAllPermission}`);
    this.log(`Filters: ${JSON.stringify(filters)}`);

    // Build query - Chỉ load data cần thiết cho list screen
    const queryBuilder = this.misaOrderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.user', 'createdByUser')
      .leftJoinAndSelect('order.approvedBy', 'approvedBy')
      .leftJoinAndSelect('approvedBy.user', 'approvedByUser')
      .leftJoinAndSelect('order.assignedTo', 'assignedTo')
      .leftJoinAndSelect('assignedTo.user', 'assignedToUser')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.factory', 'factory');

    // Permission-based filtering
    if (hasViewAllPermission) {
      // Nếu có quyền view_all_orders: Xem TẤT CẢ đơn trong factory
      queryBuilder.where('order.factoryId = :factoryId', {
        factoryId: employee.factoryId,
      });
    } else {
      // Nếu không: Chỉ xem đơn được assign trong bảng orderAssignment
      queryBuilder.where(
        'EXISTS (SELECT 1 FROM "orderAssignment" oa WHERE oa."orderId" = order.id AND oa."employeeId" = :employeeId AND oa."deletedAt" IS NULL)',
        { employeeId }
      );
    }

    // Apply filters
    if (filters?.status) {
      queryBuilder.andWhere('order.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.step) {
      if (hasViewAllPermission) {
        // Người có quyền xem tất cả: filter theo currentStep của order
        queryBuilder.andWhere('order.currentStep = :step', {
          step: filters.step,
        });
      } else {
        // Nhân viên thường: filter theo step được assign cho mình
        queryBuilder.andWhere(
          'EXISTS (SELECT 1 FROM "orderAssignment" oa WHERE oa."orderId" = order.id AND oa."employeeId" = :employeeId AND oa."step" = :step AND oa."deletedAt" IS NULL)',
          { employeeId, step: filters.step }
        );
      }
    }

    if (filters?.startDate) {
      queryBuilder.andWhere('order.orderDate >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters?.endDate) {
      queryBuilder.andWhere('order.orderDate <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(order.orderNumber ILIKE :search OR order.customerName ILIKE :search OR order.productName ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    // Order by
    queryBuilder.orderBy('order.createdAt', 'DESC');

    // Pagination
    if (filters?.page && filters?.limit) {
      const skip = (filters.page - 1) * filters.limit;
      queryBuilder.skip(skip).take(filters.limit);
    }

    const orders = await queryBuilder.getMany();
    this.log(`Found ${orders.length} orders for employee ${employeeId}`);

    return orders;
  }

  /**
   * Gửi thông báo cho nhân viên được giao đơn hàng + người có quyền duyệt
   */
  private async notifyAssignedEmployees(
    order: MisaOrder,
    assignedEmployees: any[],
    step: string,
    revision: number
  ) {
    try {
      // Map step sang label tiếng Việt
      const stepLabels = {
        general: 'Xử lý chung',
        warehouse: 'Kho chuẩn bị máy + phiếu xuất kho',
        quality_check: 'Kỹ thuật kiểm tra máy',
        delivery: 'Giao vận nhận máy',
        gate_control: 'Kiểm soát + Bảo vệ',
        self_delivery: 'Giao vận chuyển máy đến khách',
        installation: 'Kỹ thuật lắp đặt máy',
        shipping_company: 'Giao cho công ty vận chuyển',
      };

      const stepLabel = stepLabels[step] || step;
      const revisionText = revision > 1 ? ` (Lần ${revision})` : '';

      // 1. Gửi cho nhân viên được assign (dùng Promise.allSettled)
      const assignedNotifications = assignedEmployees
        .filter(employee => employee.userId)
        .map(employee =>
          this.notificationService.sendNotificationToUser(
            employee.userId!,
            `Bạn được giao việc ${stepLabel}${revisionText} đơn hàng ${order.orderNumber}`,
            `Khách hàng: ${
              order.customerName || 'Không xác định'
            }\nNhấn để xem chi tiết`,
            NOTIFICATION_TYPE.MISA_ORDER_ASSIGNED,
            order.id,
            {
              orderNumber: order.orderNumber,
              customerName: order.customerName,
              orderDate: order.orderDate
                ? typeof order.orderDate === 'string'
                  ? order.orderDate
                  : order.orderDate.toISOString()
                : null,
              step: step,
              stepLabel: stepLabel,
              revision: revision,
            }
          )
        );

      const assignedResults = await Promise.allSettled(assignedNotifications);
      const assignedNotificationsSent = assignedResults.filter(
        r => r.status === 'fulfilled'
      ).length;

      // 2. Gửi cho người có quyền view_all_orders
      let managers = await this.employeeRepository
        .createQueryBuilder('employee')
        .where('employee.factoryId = :factoryId', {
          factoryId: order.factoryId,
        })
        .leftJoinAndSelect('employee.user', 'user')
        .leftJoinAndSelect('employee.roleGroups', 'roleGroups')
        .getMany();
      
      // Filter by merged permissions (from roleGroups + permissions cũ)
      managers = managers.filter(emp => hasEmployeePermission(emp, 'view_all_orders'));

      // Lấy tên nhân viên được giao
      const employeeNames = assignedEmployees
        .map(
          emp => emp.user?.fullName || emp.user?.email || `Employee #${emp.id}`
        )
        .join(', ');

      // Gửi cho managers (dùng Promise.allSettled)
      const managerNotifications = managers
        .filter(manager => manager.userId)
        .map(manager =>
          this.notificationService.sendNotificationToUser(
            manager.userId!,
            `Đơn hàng ${order.orderNumber} đã được giao việc`,
            `Đã giao cho: ${employeeNames}\nLàm: ${stepLabel}${revisionText}\nKhách hàng: ${
              order.customerName || 'Không xác định'
            }\nNhấn để xem chi tiết`,
            NOTIFICATION_TYPE.MISA_ORDER_STATUS_UPDATED,
            order.id,
            {
              orderNumber: order.orderNumber,
              customerName: order.customerName,
              orderDate: order.orderDate
                ? typeof order.orderDate === 'string'
                  ? order.orderDate
                  : order.orderDate.toISOString()
                : null,
              step: step,
              stepLabel: stepLabel,
              revision: revision,
              assignedToNames: employeeNames,
            }
          )
        );

      const managerResults = await Promise.allSettled(managerNotifications);
      const managerNotificationsSent = managerResults.filter(
        r => r.status === 'fulfilled'
      ).length;
    } catch (error) {
      this.error('Error sending notifications', error);
      // Không throw error để không ảnh hưởng đến việc assign đơn hàng
    }
  }

  /**
   * Gửi thông báo cho phòng ban khi đơn hàng được duyệt
   */
  private async notifyDepartmentAboutApprovedOrder(
    order: MisaOrder,
    departmentId: number,
    teamId?: number
  ) {
    try {
      // Lấy tất cả nhân viên trong department (và team nếu có)
      const queryBuilder = this.employeeRepository
        .createQueryBuilder('employee')
        .where('employee.departmentId = :departmentId', { departmentId })
        .andWhere('employee.factoryId = :factoryId', {
          factoryId: order.factoryId,
        })
        .leftJoinAndSelect('employee.user', 'user')
        .leftJoinAndSelect('employee.department', 'department');

      // Lọc theo team nếu có
      if (teamId) {
        queryBuilder.andWhere('employee.teamId = :teamId', { teamId });
      }

      const employees = await queryBuilder.getMany();

      if (employees.length === 0) {
        this.warn(
          ` No employees found in department ${departmentId}${
            teamId ? ` team ${teamId}` : ''
          }`
        );
        return;
      }

      const departmentName = employees[0]?.department?.name || 'Không xác định';
      const step = 'inventory_check';

      // Tính revision: Tìm revision cao nhất của step này + 1
      const maxRevisionResult = await this.orderAssignmentRepository
        .createQueryBuilder('assignment')
        .select('MAX(assignment.revision)', 'maxRevision')
        .where('assignment.orderId = :orderId', { orderId: order.id })
        .andWhere('assignment.step = :step', { step })
        .getRawOne();

      const nextRevision = (maxRevisionResult?.maxRevision || 0) + 1;

      // Tạo assignments cho tất cả nhân viên
      const assignments = employees.map(employee => {
        return this.orderAssignmentRepository.create({
          orderId: order.id,
          employeeId: employee.id,
          step,
          revision: nextRevision,
          assignedByEmployeeId: null, // Hệ thống tự động assign
          notes: 'Vui lòng kiểm tra hàng tồn và ghi chú',
        });
      });

      await this.orderAssignmentRepository.save(assignments);

      // Gửi thông báo cho từng nhân viên
      let notificationsSent = 0;
      for (const employee of employees) {
        if (employee.userId) {
          await this.notificationService.sendNotificationToUser(
            employee.userId,
            `Đơn hàng ${order.orderNumber} đã được duyệt`,
            `Khách hàng: ${
              order.customerName || 'Không xác định'
            }\nVui lòng kiểm tra hàng tồn và ghi chú.\nNhấn để xem chi tiết`,
            NOTIFICATION_TYPE.MISA_ORDER_APPROVED,
            order.id,
            {
              orderNumber: order.orderNumber,
              customerName: order.customerName,
              orderDate: order.orderDate
                ? typeof order.orderDate === 'string'
                  ? order.orderDate
                  : order.orderDate.toISOString()
                : null,
              departmentName: departmentName,
            }
          );

          notificationsSent++;
        } else {
          this.warn(` Employee ${employee.id} does not have userId, skipping`);
        }
      }

      this.log(
        `Created ${
          assignments.length
        } assignments and sent ${notificationsSent} notifications to department ${departmentName}${
          teamId ? ` (team ${teamId})` : ''
        }`
      );
    } catch (error) {
      this.error(
        'Error creating assignments and sending department notifications',
        error
      );
      // Không throw error để không ảnh hưởng đến việc approve đơn hàng
    }
  }

  /**
   * Gửi thông báo cho employees có quyền 'view_all_orders'
   */
  private async notifyCreateOrderNotification(order: MisaOrder) {
    try {
      // Tìm tất cả employees có permission 'view_all_orders' trong factory này
      let employees = await this.employeeRepository
        .createQueryBuilder('employee')
        .where('employee.factoryId = :factoryId', {
          factoryId: order.factoryId,
        })
        .leftJoinAndSelect('employee.user', 'user')
        .leftJoinAndSelect('employee.roleGroups', 'roleGroups')
        .getMany();
      
      // Filter by merged permissions (from roleGroups + permissions cũ)
      employees = employees.filter(emp => hasEmployeePermission(emp, 'view_all_orders'));

      if (employees.length === 0) {
        this.warn(
          'Không có nhân viên nào có quyền view_all_orders trong factory này'
        );
        return;
      }

      // Gửi thông báo cho từng nhân viên
      const notifications = employees
        .filter(emp => emp.userId) // Chỉ gửi cho nhân viên có userId
        .map(emp =>
          this.notificationService.sendNotificationToUser(
            emp.userId!,
            `Đơn hàng mới cần duyệt: ${order.orderNumber}`,
            `Khách hàng: ${
              order.customerName || 'Không xác định'
            }\nNgày tạo đơn: ${
              order.orderDate
                ? new Date(order.orderDate).toLocaleDateString('vi-VN')
                : '-'
            }\nNhấn để xem chi tiết`,
            NOTIFICATION_TYPE.MISA_ORDER_CREATED,
            order.id,
            {
              orderNumber: order.orderNumber,
              customerName: order.customerName,
              orderDate: order.orderDate
                ? typeof order.orderDate === 'string'
                  ? order.orderDate
                  : order.orderDate.toISOString()
                : null,
            }
          )
        );

      await Promise.allSettled(notifications);
    } catch (error) {
      this.error('Error sending notifications', error);
      // Không throw error để không ảnh hưởng đến việc tạo đơn hàng
    }
  }

  /**
   * Gửi thông báo khi đơn hàng được cập nhật từ email
   */
  private async notifyOrderUpdatedFromEmail(
    order: MisaOrder,
    changes: string[]
  ) {
    try {
      // Tìm tất cả người liên quan đến đơn hàng
      const recipientUserIds = new Set<number>();

      // 1. Người duyệt đơn
      if (order.approvedByEmployeeId) {
        const approver = await this.employeeRepository.findOne({
          where: { id: order.approvedByEmployeeId },
          relations: ['user'],
        });
        if (approver?.userId) {
          recipientUserIds.add(approver.userId);
        }
      }

      // 2. Người được assign chính
      if (order.assignedToEmployeeId) {
        const assignedEmployee = await this.employeeRepository.findOne({
          where: { id: order.assignedToEmployeeId },
          relations: ['user'],
        });
        if (assignedEmployee?.userId) {
          recipientUserIds.add(assignedEmployee.userId);
        }
      }

      // 3. Tất cả employees trong assignments
      const assignments = await this.orderAssignmentRepository.find({
        where: { orderId: order.id },
        relations: ['employee', 'employee.user'],
      });

      for (const assignment of assignments) {
        if (assignment.employee?.userId) {
          recipientUserIds.add(assignment.employee.userId);
        }
      }

      // 4. Tất cả users có permission 'approve_orders' trong factory
      let approvers = await this.employeeRepository
        .createQueryBuilder('employee')
        .where('employee.factoryId = :factoryId', {
          factoryId: order.factoryId,
        })
        .leftJoinAndSelect('employee.user', 'user')
        .leftJoinAndSelect('employee.roleGroups', 'roleGroups')
        .getMany();
      
      // Filter by merged permissions (from roleGroups + permissions cũ)
      approvers = approvers.filter(emp => hasEmployeePermission(emp, 'approve_orders'));

      for (const approver of approvers) {
        if (approver.userId) {
          recipientUserIds.add(approver.userId);
        }
      }

      // Tạo message body với thông tin chi tiết
      let body: string;
      if (changes.length > 0) {
        const changesList = changes.join('\n• ');
        body = `Đơn hàng đã được cập nhật từ email mới\n\nThay đổi:\n• ${changesList}\n\nVui lòng kiểm tra lại chi tiết đơn hàng.\nNhấn để xem chi tiết`;
      } else {
        body = `Đơn hàng đã được cập nhật từ email mới\n\nVui lòng kiểm tra lại chi tiết đơn hàng.\nNhấn để xem chi tiết`;
      }

      // Gửi notification cho tất cả người liên quan (dùng Promise.allSettled để không bị dừng khi một user failed)
      const notifications = Array.from(recipientUserIds).map(userId =>
        this.notificationService.sendNotificationToUser(
          userId,
          `Đơn hàng ${order.orderNumber} đã cập nhật`,
          body,
          NOTIFICATION_TYPE.MISA_ORDER_STATUS_UPDATED,
          order.id,
          {
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            orderDate: order.orderDate
              ? typeof order.orderDate === 'string'
                ? order.orderDate
                : order.orderDate.toISOString()
              : null,
            status: 'updated_from_email',
            changes: changes,
          }
        )
      );

      const results = await Promise.allSettled(notifications);
      const notificationsSent = results.filter(
        r => r.status === 'fulfilled'
      ).length;
      const notificationsFailed = results.filter(
        r => r.status === 'rejected'
      ).length;

      if (notificationsFailed > 0) {
        this.warn(
          `Sent ${notificationsSent}/${recipientUserIds.size} notifications (${notificationsFailed} failed) about order updated from email (${changes.length} changes)`
        );
      } else {
        this.log(
          `✅ Sent ${notificationsSent} notifications about order updated from email (${changes.length} changes)`
        );
      }
    } catch (error) {
      this.error('❌ Error sending order updated notifications', error);
      // Không throw error để không ảnh hưởng đến việc update đơn hàng
    }
  }

  /**
   * Gửi thông báo khi xác nhận hàng về
   */
  private async notifyOrderReceivedConfirmed(order: MisaOrder) {
    try {
      // Gửi cho tất cả users có permission 'approve_orders' trong factory
      let approvers = await this.employeeRepository
        .createQueryBuilder('employee')
        .where('employee.factoryId = :factoryId', {
          factoryId: order.factoryId,
        })
        .leftJoinAndSelect('employee.user', 'user')
        .leftJoinAndSelect('employee.roleGroups', 'roleGroups')
        .getMany();
      
      // Filter by merged permissions (from roleGroups + permissions cũ)
      approvers = approvers.filter(emp => hasEmployeePermission(emp, 'approve_orders'));

      if (approvers.length === 0) {
        this.warn(
          ' No approvers found with approve_orders permission in factory'
        );
        return;
      }

      // Gửi thông báo cho từng approver (dùng Promise.allSettled)
      const notifications = approvers
        .filter(approver => approver.userId)
        .map(approver =>
          this.notificationService.sendNotificationToUser(
            approver.userId!,
            `Hàng đã về cho đơn hàng ${order.orderNumber}`,
            `Khách hàng: ${
              order.customerName || 'Không xác định'
            }\nHàng đã về đầy đủ, sẵn sàng giao việc.\nNhấn để xem chi tiết`,
            NOTIFICATION_TYPE.MISA_ORDER_STATUS_UPDATED,
            order.id,
            {
              orderNumber: order.orderNumber,
              customerName: order.customerName,
              orderDate: order.orderDate
                ? typeof order.orderDate === 'string'
                  ? order.orderDate
                  : order.orderDate.toISOString()
                : null,
              status: 'order_received_confirmed',
            }
          )
        );

      const results = await Promise.allSettled(notifications);
      const notificationsSent = results.filter(
        r => r.status === 'fulfilled'
      ).length;

      this.log(
        `Sent ${notificationsSent}/${approvers.length} notifications to approvers for order received confirmation`
      );
    } catch (error) {
      this.error(
        'Error sending order received confirmation notifications',
        error
      );
      // Không throw error để không ảnh hưởng đến việc xác nhận hàng về
    }
  }

  /**
   * Gửi thông báo khi không cần đặt hàng
   */
  private async notifyNoNeedToOrder(
    order: MisaOrder,
  ) {
    try {
      let approvers = await this.employeeRepository
        .createQueryBuilder('employee')
        .where('employee.factoryId = :factoryId', {
          factoryId: order.factoryId,
        })
        .leftJoinAndSelect('employee.user', 'user')
        .leftJoinAndSelect('employee.roleGroups', 'roleGroups')
        .getMany();
      
      // Filter by merged permissions (from roleGroups + permissions cũ)
      approvers = approvers.filter(emp => hasEmployeePermission(emp, 'approve_orders'));

      if (approvers.length === 0) {
        this.warn(
          'No approvers found with approve_orders permission in factory'
        );
        return;
      }

      // Gửi thông báo cho từng approver (dùng Promise.allSettled)
      const notifications = approvers
        .filter(approver => approver.userId)
        .map(approver =>
          this.notificationService.sendNotificationToUser(
            approver.userId!,
            `Đơn hàng ${order.orderNumber} đã kiểm tra hàng tồn`,
            `Khách hàng: ${
              order.customerName || 'Không xác định'
            }\nHàng tồn đủ, sẵn sàng giao việc.\nNhấn để xem chi tiết`,
            NOTIFICATION_TYPE.MISA_ORDER_STATUS_UPDATED,
            order.id,
            {
              orderNumber: order.orderNumber,
              customerName: order.customerName,
              orderDate: order.orderDate
                ? typeof order.orderDate === 'string'
                  ? order.orderDate
                  : order.orderDate.toISOString()
                : null,
              status: 'inventory_checked',
            }
          )
        );

      const results = await Promise.allSettled(notifications);
      const notificationsSent = results.filter(
        r => r.status === 'fulfilled'
      ).length;

      this.log(
        `Sent ${notificationsSent}/${approvers.length} notifications to approvers for inventory check completion`
      );
    } catch (error) {
      this.error(
        'Error sending inventory check completion notifications',
        error
      );
      // Không throw error để không ảnh hưởng đến việc hoàn thành kiểm tra
    }
  }
}
