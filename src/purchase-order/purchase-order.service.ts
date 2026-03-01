import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Not, In } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { Employee } from 'src/employee/entities/employee.entity';
import { User } from 'src/users/entities/user.entity';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ConfirmExpectedDateDto } from './dto/confirm-expected-date.dto';
import { UpdatePurchaseOrderStatusDto } from './dto/update-purchase-order-status.dto';
import { ConfirmReceivedDto } from './dto/confirm-received.dto';
import { NotificationService } from 'src/notification/notification.service';
import { NOTIFICATION_TYPE } from 'src/notification/constants/notification-type.constant';
import { throwBadRequestError, throwNotFoundError } from 'src/utils/error.helper';
import { hasEmployeePermission } from 'src/utils/employee-permissions.helper';

@Injectable()
export class PurchaseOrderService {
  private readonly context = 'PurchaseOrderService';

  constructor(
    @InjectRepository(PurchaseOrder)
    private purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private purchaseOrderItemRepository: Repository<PurchaseOrderItem>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationService: NotificationService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  // Helper methods để log
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
   * Tính số ngày còn lại đến expectedDeliveryDate
   */
  private calculateDaysUntilDelivery(expectedDeliveryDate: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deliveryDate = new Date(expectedDeliveryDate);
    deliveryDate.setHours(0, 0, 0, 0);
    const diffTime = deliveryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Cron job chạy lúc 1h sáng mỗi ngày để cập nhật daysUntilDelivery
   */
  @Cron('0 1 * * *') // 1:00 AM mỗi ngày
  async updateDaysUntilDelivery() {
    try {
      this.log('🕐 Starting daily daysUntilDelivery update...');

      // Lấy tất cả đơn đang chờ hàng về (status = waiting)
      const orders = await this.purchaseOrderRepository.find({
        where: {
          status: 'waiting',
          expectedDeliveryDate: Not(null as any),
        },
      });

      let updatedCount = 0;
      for (const order of orders) {
        if (order.expectedDeliveryDate) {
          const daysUntilDelivery = this.calculateDaysUntilDelivery(order.expectedDeliveryDate);
          await this.purchaseOrderRepository.update(order.id, { daysUntilDelivery });
          updatedCount++;
        }
      }

      this.log(`✅ Updated daysUntilDelivery for ${updatedCount} orders`);
    } catch (error) {
      this.error('❌ Error updating daysUntilDelivery', error);
    }
  }

  /**
   * Tạo đơn mua hàng mới
   */
  async create(dto: CreatePurchaseOrderDto, employeeId: number) {
    try {
      const employee = await this.employeeRepository.findOne({
        where: { id: employeeId },
      });

      if (!employee) {
        throwNotFoundError('Employee không tồn tại');
      }

      // Tạo purchase order
      const purchaseOrder = this.purchaseOrderRepository.create({
        orderNumber: dto.orderNumber,
        orderDate: new Date(dto.orderDate),
        supplierName: dto.supplierName,
        supplierPhone: dto.supplierPhone,
        supplierAddress: dto.supplierAddress,
        supplierTaxCode: dto.supplierTaxCode,
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
        deliveryLocation: dto.deliveryLocation,
        paymentTerms: dto.paymentTerms,
        notes: dto.notes,
        createdByEmployeeId: employeeId,
        factoryId: employee.factoryId,
        status: 'pending', // Chờ nhập ngày hàng về
      });

      await this.purchaseOrderRepository.save(purchaseOrder);

      // Tạo items
      const items = dto.items.map((item) =>
        this.purchaseOrderItemRepository.create({
          purchaseOrderId: purchaseOrder.id,
          productCode: item.productCode,
          productName: item.productName,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          notes: item.notes,
        }),
      );

      await this.purchaseOrderItemRepository.save(items);

      this.log(`✅ Created purchase order ${purchaseOrder.orderNumber}`);

      // Gửi notification cho employees có quyền approve_purchase_orders
      await this.notifyNewPurchaseOrder(purchaseOrder.id);

      return this.findOne(purchaseOrder.id);
    } catch (error) {
      this.error('❌ Error creating purchase order', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách đơn mua hàng
   */
  async findAll(
    employeeId: number | null,
    page = 1,
    limit = 10,
    status?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;

    const queryBuilder = this.purchaseOrderRepository
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.user', 'createdByUser')
      .leftJoinAndSelect('po.confirmedBy', 'confirmedBy')
      .leftJoinAndSelect('confirmedBy.user', 'confirmedByUser')
      .leftJoinAndSelect('po.receivedBy', 'receivedBy')
      .leftJoinAndSelect('receivedBy.user', 'receivedByUser')
      .leftJoinAndSelect('po.completedBy', 'completedBy')
      .leftJoinAndSelect('completedBy.user', 'completedByUser')
      .leftJoinAndSelect('po.factory', 'factory')
      .orderBy('po.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    // Employee_gtg chỉ thấy đơn của factory mình
    if (employeeId) {
      const employee = await this.employeeRepository.findOne({
        where: { id: employeeId },
      });

      if (employee) {
        queryBuilder.andWhere('po.factoryId = :factoryId', {
          factoryId: employee.factoryId,
        });
      }
    }

    // Filter by status
    if (status) {
      queryBuilder.andWhere('po.status = :status', { status });
    }

    // Filter by date range (orderDate)
    if (startDate) {
      queryBuilder.andWhere('po.orderDate >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      queryBuilder.andWhere('po.orderDate <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Lấy chi tiết đơn mua hàng
   */
  async findOne(id: number) {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { id },
      relations: [
        'items',
        'createdBy',
        'createdBy.user',
        'confirmedBy',
        'confirmedBy.user',
        'receivedBy',
        'receivedBy.user',
        'completedBy',
        'completedBy.user',
        'factory',
      ],
    });

    if (!purchaseOrder) {
      throwNotFoundError('Purchase order không tồn tại');
    }

    return purchaseOrder;
  }

  /**
   * Nhập ngày dự kiến hàng về (thay cho approve)
   */
  async confirmExpectedDate(id: number, dto: ConfirmExpectedDateDto, employeeId: number) {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { id },
    });

    if (!purchaseOrder) {
      throwNotFoundError('Purchase order không tồn tại');
    }

    if (purchaseOrder.status !== 'pending') {
      throwBadRequestError('Chỉ có thể nhập ngày dự kiến khi đơn ở trạng thái chờ');
    }

    const expectedDeliveryDate = new Date(dto.expectedDeliveryDate);
    const daysUntilDelivery = this.calculateDaysUntilDelivery(expectedDeliveryDate);

    // Update trực tiếp để tránh cascade update items
    await this.purchaseOrderRepository.update(id, {
      confirmedByEmployeeId: employeeId,
      confirmedAt: new Date(),
      expectedDeliveryDate,
      daysUntilDelivery,
      status: 'waiting', // Chuyển sang trạng thái chờ hàng về
      ...(dto.notes ? { notes: dto.notes } : {}),
    });

    this.log(`✅ Confirmed expected date for purchase order ${purchaseOrder.orderNumber}`);

    // Gửi notification cho người có quyền view_all_purchase_orders
    await this.notifyPurchaseOrderConfirmed(id);

    return this.findOne(id);
  }

  /**
   * Xác nhận đã nhận hàng
   */
  async confirmReceived(id: number, dto: ConfirmReceivedDto, employeeId: number) {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { id },
    });

    if (!purchaseOrder) {
      throwNotFoundError('Purchase order không tồn tại');
    }

    if (purchaseOrder.status !== 'waiting') {
      throwBadRequestError('Chỉ có thể xác nhận nhận hàng khi đơn đang chờ hàng về');
    }

    // Update trực tiếp để tránh cascade update items
    await this.purchaseOrderRepository.update(id, {
      receivedByEmployeeId: employeeId,
      receivedAt: new Date(),
      status: 'received',
      daysUntilDelivery: 0, // Đã nhận hàng
      ...(dto.notes ? { notes: dto.notes } : {}),
    });

    this.log(`✅ Confirmed received for purchase order ${purchaseOrder.orderNumber}`);

    // Gửi notification cho người nhập ngày và người tạo
    await this.notifyPurchaseOrderReceived(id);

    return this.findOne(id);
  }

  /**
   * Cập nhật trạng thái (completed, cancelled)
   */
  async updateStatus(id: number, dto: UpdatePurchaseOrderStatusDto, employeeId: number) {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { id },
    });

    if (!purchaseOrder) {
      throwNotFoundError('Purchase order không tồn tại');
    }

    // Validate status transitions
    const updateData: any = {
      status: dto.status,
      ...(dto.notes ? { notes: dto.notes } : {}),
    };

    if (dto.status === 'completed') {
      if (purchaseOrder.status !== 'received') {
        throwBadRequestError('Chỉ có thể hoàn thành đơn khi đã nhận hàng');
      }
      updateData.completedByEmployeeId = employeeId;
      updateData.completedAt = new Date();
    }

    // Update trực tiếp để tránh cascade update items
    await this.purchaseOrderRepository.update(id, updateData);

    this.log(`✅ Updated purchase order ${purchaseOrder.orderNumber} status to ${dto.status}`);

    // Gửi notification khi completed
    if (dto.status === 'completed') {
      await this.notifyPurchaseOrderCompleted(id);
    }

    return this.findOne(id);
  }

  /**
   * Cập nhật đơn từ email (khi nhận email mới)
   */
  async updateFromEmail(orderId: number, dto: CreatePurchaseOrderDto) {
    try {
      const order = await this.purchaseOrderRepository.findOne({
        where: { id: orderId },
        relations: ['items'],
      });

      if (!order) {
        throwNotFoundError('Purchase order không tồn tại');
      }

      // Lưu thông tin cũ để so sánh
      const oldData = {
        orderDate: order.orderDate,
        supplierName: order.supplierName,
        supplierPhone: order.supplierPhone,
        supplierAddress: order.supplierAddress,
        items: order.items ? [...order.items] : [],
      };

      // XÓA items cũ TRƯỚC
      await this.purchaseOrderItemRepository.delete({ purchaseOrderId: order.id });

      // Clear items từ order entity
      order.items = [];

      // Update order info
      order.orderDate = new Date(dto.orderDate);
      order.supplierName = dto.supplierName;
      order.supplierPhone = dto.supplierPhone || null;
      order.supplierAddress = dto.supplierAddress || null;
      order.supplierTaxCode = dto.supplierTaxCode || null;
      order.deliveryDate = dto.deliveryDate ? new Date(dto.deliveryDate) : null;
      order.deliveryLocation = dto.deliveryLocation || null;
      order.paymentTerms = dto.paymentTerms || null;

      await this.purchaseOrderRepository.save(order);

      // Tạo items mới
      const items = dto.items.map((item) =>
        this.purchaseOrderItemRepository.create({
          purchaseOrderId: order.id,
          productCode: item.productCode,
          productName: item.productName,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          notes: item.notes,
        }),
      );

      await this.purchaseOrderItemRepository.save(items);

      // Phát hiện thay đổi
      const changes = this.detectOrderChanges(oldData, dto);

      // Nếu đơn đã xác nhận ngày về → GỬI NOTIFICATION
      const isConfirmed = order.status !== 'pending';
      if (isConfirmed && changes.length > 0) {
        this.log(`⚠️ Purchase order ${order.orderNumber} updated from email - Changes: ${changes.length} field(s)`);
        const updatedOrder = await this.findOne(order.id);
        await this.notifyPurchaseOrderUpdatedFromEmail(updatedOrder, changes);
      }

      return this.findOne(order.id);
    } catch (error) {
      this.error(`❌ Error in updateFromEmail for purchase order ID ${orderId}`, error);
      throw error;
    }
  }

  /**
   * Phát hiện thay đổi giữa đơn cũ và đơn mới
   */
  private detectOrderChanges(oldData: any, newData: any): string[] {
    const changes: string[] = [];

    try {
      // 1. Ngày đơn hàng
      if (oldData.orderDate && newData.orderDate) {
        const oldDate = new Date(oldData.orderDate).toLocaleDateString('vi-VN');
        const newDate = new Date(newData.orderDate).toLocaleDateString('vi-VN');
        if (oldDate !== newDate) {
          changes.push(`Ngày đơn hàng: ${oldDate} → ${newDate}`);
        }
      }

      // 2. Tên nhà cung cấp
      if (oldData.supplierName !== newData.supplierName) {
        changes.push(`Nhà cung cấp: ${oldData.supplierName} → ${newData.supplierName}`);
      }

      // 3. Số điện thoại
      if (oldData.supplierPhone !== newData.supplierPhone) {
        changes.push(`SĐT: ${oldData.supplierPhone || 'N/A'} → ${newData.supplierPhone || 'N/A'}`);
      }

      // 4. Địa chỉ
      if (oldData.supplierAddress !== newData.supplierAddress) {
        changes.push(`Địa chỉ: ${oldData.supplierAddress || 'N/A'} → ${newData.supplierAddress || 'N/A'}`);
      }

      // 5. Số lượng sản phẩm
      const oldItemsCount = oldData.items?.length || 0;
      const newItemsCount = newData.items?.length || 0;
      if (oldItemsCount !== newItemsCount) {
        changes.push(`Số sản phẩm: ${oldItemsCount} → ${newItemsCount}`);
      }

      // 6. Chi tiết sản phẩm
      if (oldData.items && newData.items) {
        for (let i = 0; i < Math.min(oldData.items.length, newData.items.length); i++) {
          const oldItem = oldData.items[i];
          const newItem = newData.items[i];

          if (oldItem.productName !== newItem.productName) {
            changes.push(`SP ${i + 1} tên: ${oldItem.productName} → ${newItem.productName}`);
          }
          if (Number(oldItem.quantity) !== Number(newItem.quantity)) {
            changes.push(`SP ${i + 1} SL: ${oldItem.quantity} → ${newItem.quantity}`);
          }
        }
      }
    } catch (error) {
      this.error('Error detecting order changes', error);
    }

    return changes;
  }

  /**
   * Gửi notification khi có đơn mua hàng mới
   */
  private async notifyNewPurchaseOrder(orderId: number) {
    try {
      const order = await this.findOne(orderId);

      // Tìm tất cả employees có permission 'approve_purchase_orders' trong factory này
      let employees = await this.employeeRepository
        .createQueryBuilder('employee')
        .where('employee.factoryId = :factoryId', { factoryId: order.factoryId })
        .leftJoinAndSelect('employee.user', 'user')
        .leftJoinAndSelect('employee.roleGroups', 'roleGroups')
        .getMany();
      
      // Filter by merged permissions (from roleGroups + permissions cũ)
      employees = employees.filter(emp => hasEmployeePermission(emp, 'approve_purchase_orders'));

      if (employees.length === 0) {
        this.warn('Không có nhân viên nào có quyền approve_purchase_orders trong factory này');
        return;
      }

      // Gửi thông báo cho từng nhân viên
      const notifications = employees
        .filter((emp) => emp.userId) // Chỉ gửi cho nhân viên có userId
        .map((emp) =>
          this.notificationService.sendNotificationToUser(
            emp.userId!,
            `Đơn mua hàng mới: ${order.orderNumber}`,
            `Nhà cung cấp: ${order.supplierName || 'Không xác định'}\nVui lòng nhập ngày dự kiến hàng về`,
            NOTIFICATION_TYPE.PURCHASE_ORDER_CREATED,
            order.id,
            {
              orderNumber: order.orderNumber,
              supplierName: order.supplierName,
              orderDate: order.orderDate ? (typeof order.orderDate === 'string' ? order.orderDate : order.orderDate.toISOString()) : null,
            },
          ),
        );

      await Promise.allSettled(notifications);
    } catch (error) {
      this.error('Error sending notifications', error);
    }
  }

  /**
   * Gửi notification khi đã nhập ngày dự kiến hàng về
   */
  private async notifyPurchaseOrderConfirmed(orderId: number) {
    try {
      const order = await this.findOne(orderId);

      // Tìm tất cả employees có permission 'view_all_purchase_orders' trong factory này
      let employees = await this.employeeRepository
        .createQueryBuilder('employee')
        .where('employee.factoryId = :factoryId', { factoryId: order.factoryId })
        .leftJoinAndSelect('employee.user', 'user')
        .leftJoinAndSelect('employee.roleGroups', 'roleGroups')
        .getMany();
      
      // Filter by merged permissions (from roleGroups + permissions cũ)
      employees = employees.filter(emp => hasEmployeePermission(emp, 'view_all_purchase_orders'));

      // Cũng gửi cho người tạo đơn
      if (order.createdBy?.userId) {
        const creatorNotification = this.notificationService.sendNotificationToUser(
          order.createdBy.userId,
          `Đơn mua hàng ${order.orderNumber} đã được xác nhận`,
          `Ngày dự kiến hàng về: ${order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString('vi-VN') : '-'}\nCòn ${order.daysUntilDelivery} ngày`,
          NOTIFICATION_TYPE.PURCHASE_ORDER_APPROVED,
          order.id,
          {
            orderNumber: order.orderNumber,
            supplierName: order.supplierName,
            expectedDeliveryDate: order.expectedDeliveryDate,
            daysUntilDelivery: order.daysUntilDelivery,
          },
        );
        await creatorNotification;
      }

      // Gửi thông báo cho người có quyền view_all_purchase_orders
      const notifications = employees
        .filter((emp) => emp.userId && emp.userId !== order.createdBy?.userId) // Không gửi lại cho người tạo
        .map((emp) =>
          this.notificationService.sendNotificationToUser(
            emp.userId!,
            `Đơn mua hàng ${order.orderNumber} - Chờ hàng về`,
            `Nhà cung cấp: ${order.supplierName}\nNgày dự kiến: ${order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString('vi-VN') : '-'}\nCòn ${order.daysUntilDelivery} ngày`,
            NOTIFICATION_TYPE.PURCHASE_ORDER_APPROVED,
            order.id,
            {
              orderNumber: order.orderNumber,
              supplierName: order.supplierName,
              expectedDeliveryDate: order.expectedDeliveryDate,
              daysUntilDelivery: order.daysUntilDelivery,
            },
          ),
        );

      await Promise.allSettled(notifications);
    } catch (error) {
      this.error('❌ Error sending confirmed notification', error);
    }
  }

  /**
   * Gửi notification khi xác nhận đã nhận hàng
   */
  private async notifyPurchaseOrderReceived(orderId: number) {
    try {
      const order = await this.findOne(orderId);
      const recipientUserIds = new Set<number>();

      // Người tạo
      if (order.createdBy?.userId) {
        recipientUserIds.add(order.createdBy.userId);
      }

      // Người nhập ngày dự kiến
      if (order.confirmedBy?.userId) {
        recipientUserIds.add(order.confirmedBy.userId);
      }

      const notifications = Array.from(recipientUserIds).map((userId) =>
        this.notificationService.sendNotificationToUser(
          userId,
          `📥 Đã nhận hàng - ${order.orderNumber}`,
          `Nhà cung cấp: ${order.supplierName}. Hàng đã về kho.`,
          NOTIFICATION_TYPE.PURCHASE_ORDER_RECEIVED,
          order.id,
          {
            orderNumber: order.orderNumber,
            supplierName: order.supplierName,
          },
        ),
      );

      await Promise.allSettled(notifications);
    } catch (error) {
      this.error('❌ Error sending received notification', error);
    }
  }

  /**
   * Gửi notification khi hoàn thành đơn
   */
  private async notifyPurchaseOrderCompleted(orderId: number) {
    try {
      const order = await this.findOne(orderId);
      const recipientUserIds = new Set<number>();

      // Tất cả người liên quan
      if (order.createdBy?.userId) recipientUserIds.add(order.createdBy.userId);
      if (order.confirmedBy?.userId) recipientUserIds.add(order.confirmedBy.userId);
      if (order.receivedBy?.userId) recipientUserIds.add(order.receivedBy.userId);

      const notifications = Array.from(recipientUserIds).map((userId) =>
        this.notificationService.sendNotificationToUser(
          userId,
          `✅ Đơn mua hàng ${order.orderNumber} hoàn thành`,
          `Nhà cung cấp: ${order.supplierName}. Đơn hàng đã được hoàn tất.`,
          NOTIFICATION_TYPE.PURCHASE_ORDER_COMPLETED,
          order.id,
          {
            orderNumber: order.orderNumber,
            supplierName: order.supplierName,
          },
        ),
      );

      await Promise.allSettled(notifications);
    } catch (error) {
      this.error('❌ Error sending completed notification', error);
    }
  }

  /**
   * Gửi notification khi đơn được cập nhật từ email
   */
  private async notifyPurchaseOrderUpdatedFromEmail(order: PurchaseOrder, changes: string[]) {
    try {
      // Tìm tất cả người liên quan đến đơn mua hàng
      const recipientUserIds = new Set<number>();

      // 1. Người nhập ngày dự kiến
      if (order.confirmedByEmployeeId) {
        const confirmer = await this.employeeRepository.findOne({
          where: { id: order.confirmedByEmployeeId },
          relations: ['user'],
        });
        if (confirmer?.userId) {
          recipientUserIds.add(confirmer.userId);
        }
      }

      // 2. Người tạo đơn
      if (order.createdByEmployeeId) {
        const creator = await this.employeeRepository.findOne({
          where: { id: order.createdByEmployeeId },
          relations: ['user'],
        });
        if (creator?.userId) {
          recipientUserIds.add(creator.userId);
        }
      }

      // 3. Người nhận hàng
      if (order.receivedByEmployeeId) {
        const receiver = await this.employeeRepository.findOne({
          where: { id: order.receivedByEmployeeId },
          relations: ['user'],
        });
        if (receiver?.userId) {
          recipientUserIds.add(receiver.userId);
        }
      }

      // 4. Tất cả users có permission 'approve_purchase_orders' trong factory
      let approvers = await this.employeeRepository
        .createQueryBuilder('employee')
        .where('employee.factoryId = :factoryId', { factoryId: order.factoryId })
        .leftJoinAndSelect('employee.user', 'user')
        .leftJoinAndSelect('employee.roleGroups', 'roleGroups')
        .getMany();
      
      // Filter by merged permissions (from roleGroups + permissions cũ)
      approvers = approvers.filter(emp => hasEmployeePermission(emp, 'approve_purchase_orders'));

      for (const approver of approvers) {
        if (approver.userId) {
          recipientUserIds.add(approver.userId);
        }
      }

      // Tạo message body với thông tin chi tiết
      const changesText = changes.slice(0, 3).join(', ');
      const body = `Nhà cung cấp: ${order.supplierName || 'Không xác định'}\nThay đổi: ${changesText}${changes.length > 3 ? '...' : ''}\nNhấn để xem chi tiết`;

      const notifications = Array.from(recipientUserIds).map((userId) =>
        this.notificationService.sendNotificationToUser(
          userId,
          `Đơn mua hàng ${order.orderNumber} đã cập nhật`,
          body,
          NOTIFICATION_TYPE.PURCHASE_ORDER_UPDATED,
          order.id,
          {
            orderNumber: order.orderNumber,
            supplierName: order.supplierName,
            changes: changes,
          },
        ),
      );

      await Promise.allSettled(notifications);
    } catch (error) {
      this.error('Error sending updated notifications', error);
    }
  }

  /**
   * Xóa đơn mua hàng
   */
  async delete(id: number) {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { id },
    });

    if (!purchaseOrder) {
      throwNotFoundError('Purchase order không tồn tại');
    }

    // Xóa items trước
    await this.purchaseOrderItemRepository.delete({ purchaseOrderId: id });

    // Xóa purchase order
    await this.purchaseOrderRepository.delete(id);

    this.log(`✅ Deleted purchase order ${purchaseOrder.orderNumber}`);
  }
}
