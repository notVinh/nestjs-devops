import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Employee } from 'src/employee/entities/employee.entity';
import { EMPLOYEE_PERMISSION } from 'src/employee/constants/employee-permission.constant';
import { hasEmployeePermission } from 'src/utils/employee-permissions.helper';
import { PurchaseRequisition } from 'src/purchase-requisition/entities/purchase-requisition.entity';
import { MisaSaOrder } from '../entities/misa-sa-order.entity';
import {
  MisaSaOrderWorkflowHistory,
  WORKFLOW_ACTION,
} from '../entities/misa-sa-order-workflow-history.entity';
import { MisaNotificationHelper } from './misa-notification.helper';
import {
  ORDER_WORKFLOW_STATUS,
  ORDER_WORKFLOW_STATUS_LABELS,
} from '../constants/workflow.constant';

/**
 * Service xử lý workflow duyệt đơn hàng
 * Bao gồm: submit, approve, reject
 */
@Injectable()
export class MisaWorkflowService {
  private readonly logger = new Logger(MisaWorkflowService.name);

  constructor(
    @InjectRepository(MisaSaOrder)
    private readonly saOrderRepository: Repository<MisaSaOrder>,
    @InjectRepository(MisaSaOrderWorkflowHistory)
    private readonly workflowHistoryRepository: Repository<MisaSaOrderWorkflowHistory>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(PurchaseRequisition)
    private readonly purchaseRequisitionRepository: Repository<PurchaseRequisition>,
    private readonly notificationHelper: MisaNotificationHelper
  ) {}

  /**
   * Lấy tên hiển thị của employee
   */
  private getEmployeeName(employee: Employee): string {
    return (
      employee.user?.fullName || employee.user?.email || `NV #${employee.id}`
    );
  }

  /**
   * Ghi lịch sử workflow
   */
  async recordWorkflowHistory(data: {
    orderId: number;
    action: string;
    fromStatus?: string | null;
    toStatus?: string | null;
    performedByEmployeeId: number;
    performedByName?: string | null;
    notes?: string | null;
    metadata?: Record<string, any> | null;
  }): Promise<MisaSaOrderWorkflowHistory> {
    const history = this.workflowHistoryRepository.create({
      orderId: data.orderId,
      action: data.action,
      fromStatus: data.fromStatus || null,
      toStatus: data.toStatus || null,
      performedByEmployeeId: data.performedByEmployeeId,
      performedByName: data.performedByName || null,
      performedAt: new Date(),
      notes: data.notes || null,
      metadata: data.metadata || null,
    });

    return this.workflowHistoryRepository.save(history);
  }

  /**
   * Lấy lịch sử workflow của đơn hàng
   */
  async getWorkflowHistory(
    orderId: number
  ): Promise<MisaSaOrderWorkflowHistory[]> {
    return this.workflowHistoryRepository.find({
      where: { orderId, deletedAt: IsNull() },
      order: { performedAt: 'DESC' },
      relations: ['performedBy'],
    });
  }

  /**
   * Sale Admin gửi thông tin đơn hàng mới tới các phòng ban
   */
  async submitOrderForApproval(
    orderId: number,
    employeeId: number,
    employeeName: string,
    needsAdditionalOrder?: boolean,
    additionalOrderNote?: string
  ): Promise<{
    success: boolean;
    message: string;
    order?: MisaSaOrder;
    purchaseRequisition?: PurchaseRequisition;
  }> {
    // Lấy thông tin employee và kiểm tra quyền
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
      relations: ['roleGroups', 'user'],
    });

    if (!employee) {
      return { success: false, message: 'Không tìm thấy thông tin nhân viên' };
    }

    // Kiểm tra quyền submit_order_for_approval
    if (
      !hasEmployeePermission(
        employee,
        EMPLOYEE_PERMISSION.SUBMIT_ORDER_FOR_APPROVAL
      )
    ) {
      return {
        success: false,
        message:
          'Bạn không có quyền gửi duyệt đơn hàng. Vui lòng liên hệ quản trị viên.',
      };
    }

    const order = await this.saOrderRepository.findOne({
      where: { id: orderId, deletedAt: IsNull() },
    });

    if (!order) {
      return { success: false, message: 'Không tìm thấy đơn hàng' };
    }

    // Kiểm tra trạng thái hiện tại - cho phép gửi duyệt từ trạng thái draft hoặc rejected
    if (
      order.orderWorkflowStatus !== 'draft' &&
      order.orderWorkflowStatus !== 'rejected'
    ) {
      return {
        success: false,
        message: `Không thể gửi duyệt đơn hàng ở trạng thái "${order.orderWorkflowStatus}"`,
      };
    }

    // Validate các trường bắt buộc trước khi gửi duyệt
    const missingFields: string[] = [];
    if (!order.priority) missingFields.push('Độ ưu tiên');
    if (!order.requestedDeliveryDate) missingFields.push('Ngày yêu cầu giao');
    if (!order.machineType) missingFields.push('Phân loại máy');
    if (!order.region) missingFields.push('Khu vực');
    if (!order.saleType) missingFields.push('Loại bán/cho thuê');
    if (!order.province) missingFields.push('Tỉnh/TP');

    if (missingFields.length > 0) {
      return {
        success: false,
        message: `Vui lòng nhập đầy đủ thông tin trước khi gửi duyệt: ${missingFields.join(
          ', '
        )}`,
      };
    }

    // Xác định giá trị needsAdditionalOrder và additionalOrderNote thực tế
    const finalNeedsAdditionalOrder =
      needsAdditionalOrder !== undefined
        ? needsAdditionalOrder
        : order.needsAdditionalOrder;
    const finalAdditionalOrderNote =
      needsAdditionalOrder !== undefined
        ? additionalOrderNote
        : order.additionalOrderNote;

    // Validate: nếu cần đặt thêm hàng thì phải có ghi chú
    if (finalNeedsAdditionalOrder && !finalAdditionalOrderNote?.trim()) {
      return {
        success: false,
        message: 'Vui lòng nhập nội dung ghi chú khi cần đặt thêm hàng',
      };
    }

    // Cập nhật thông tin workflow
    const updateData: Partial<MisaSaOrder> = {
      orderWorkflowStatus: 'waiting_approval',
      saleAdminId: employeeId,
      saleAdminName: employeeName,
      saleAdminSubmittedAt: new Date(),
    };

    if (needsAdditionalOrder !== undefined) {
      updateData.needsAdditionalOrder = needsAdditionalOrder;
      updateData.additionalOrderNote = needsAdditionalOrder
        ? additionalOrderNote || null
        : null;
    }

    await this.saOrderRepository.update(orderId, updateData);

    // Ghi lịch sử workflow
    const isResubmit = order.orderWorkflowStatus === 'rejected';
    await this.recordWorkflowHistory({
      orderId,
      action: isResubmit
        ? WORKFLOW_ACTION.RESUBMIT_FOR_APPROVAL
        : WORKFLOW_ACTION.SUBMIT_FOR_APPROVAL,
      fromStatus: order.orderWorkflowStatus,
      toStatus: 'waiting_approval',
      performedByEmployeeId: employeeId,
      performedByName: employeeName,
      metadata: {
        needsAdditionalOrder: finalNeedsAdditionalOrder,
        additionalOrderNote: finalAdditionalOrderNote,
        isResubmit,
      },
    });

    const updatedOrder = await this.saOrderRepository.findOne({
      where: { id: orderId },
    });

    // Gửi thông báo cho những người có quyền approve_order
    if (updatedOrder) {
      await this.notificationHelper.notifyApproversAboutNewOrder(
        updatedOrder,
        employee
      );
    }

    return {
      success: true,
      message: isResubmit
        ? 'Đã gửi lại đơn hàng để duyệt'
        : 'Đã gửi đơn hàng để duyệt thành công',
      order: updatedOrder || undefined,
    };
  }

  /**
   * BGĐ duyệt hoặc từ chối đơn hàng
   */
  async approveOrRejectOrder(
    orderId: number,
    employeeId: number,
    employeeName: string,
    approved: boolean,
    note?: string
  ): Promise<{ success: boolean; message: string; order?: MisaSaOrder }> {
    // Lấy thông tin employee và kiểm tra quyền
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
      relations: ['roleGroups', 'user'],
    });

    if (!employee) {
      return { success: false, message: 'Không tìm thấy thông tin nhân viên' };
    }

    // Kiểm tra quyền approve_order
    if (!hasEmployeePermission(employee, EMPLOYEE_PERMISSION.APPROVE_ORDER)) {
      return {
        success: false,
        message:
          'Bạn không có quyền duyệt đơn hàng. Vui lòng liên hệ quản trị viên.',
      };
    }

    const order = await this.saOrderRepository.findOne({
      where: { id: orderId, deletedAt: IsNull() },
    });

    if (!order) {
      return { success: false, message: 'Không tìm thấy đơn hàng' };
    }

    // Từ chối bắt buộc phải có lý do
    if (!approved && !note?.trim()) {
      return {
        success: false,
        message: 'Vui lòng nhập lý do từ chối đơn hàng',
      };
    }

    // Kiểm tra trạng thái hiện tại
    if (order.orderWorkflowStatus !== 'waiting_approval') {
      return {
        success: false,
        message: `Không thể duyệt đơn hàng ở trạng thái "${order.orderWorkflowStatus}"`,
      };
    }

    const fromStatus = order.orderWorkflowStatus;
    // Khi duyệt, chuyển thẳng sang waiting_export (chờ xuất kho)
    const toStatus = approved
      ? ORDER_WORKFLOW_STATUS.WAITING_EXPORT
      : ORDER_WORKFLOW_STATUS.REJECTED;

    this.logger.log(
      `[approveOrRejectOrder] Order ${orderId}: ${fromStatus} → ${toStatus} (approved=${approved})`
    );

    // Cập nhật trạng thái workflow
    await this.saOrderRepository.update(orderId, {
      orderWorkflowStatus: toStatus,
    });

    // Ghi lịch sử workflow
    await this.recordWorkflowHistory({
      orderId,
      action: approved ? WORKFLOW_ACTION.APPROVE : WORKFLOW_ACTION.REJECT,
      fromStatus,
      toStatus,
      performedByEmployeeId: employeeId,
      performedByName: employeeName,
      notes: note || null,
      metadata: { approved },
    });

    const updatedOrder = await this.saOrderRepository.findOne({
      where: { id: orderId },
    });

    // Nếu duyệt và đơn hàng cần đặt thêm hàng → Tạo ĐXMH
    let purchaseRequisition: PurchaseRequisition | undefined;
    if (approved && updatedOrder?.needsAdditionalOrder) {
      purchaseRequisition = await this.createPurchaseRequisitionForOrder(
        updatedOrder,
        employeeId,
        employee.factoryId || 1,
        updatedOrder.additionalOrderNote || ''
      );

      // Gửi thông báo cho bộ phận mua hàng
      await this.notificationHelper.notifyPurchasingStaffAboutNewRequisition(
        updatedOrder,
        employeeName
      );
    }

    // Gửi thông báo cho Sale Admin
    await this.notificationHelper.notifySaleAdminAboutApproval(
      order,
      approved,
      employeeName,
      note,
      !!purchaseRequisition
    );

    // Gửi thông báo cho workflow subscribers (chỉ khi duyệt)
    if (approved && updatedOrder) {
      await this.notificationHelper.notifyOrderWorkflowSubscribers(
        updatedOrder,
        employeeName,
        note
      );
    }

    return {
      success: true,
      message: approved
        ? updatedOrder?.needsAdditionalOrder
          ? 'Duyệt đơn hàng và tạo đề xuất mua hàng thành công. Đơn hàng đã sẵn sàng để xuất kho.'
          : 'Duyệt đơn hàng thành công. Đơn hàng đã sẵn sàng để xuất kho.'
        : 'Từ chối đơn hàng thành công',
      order: updatedOrder || undefined,
    };
  }

  /**
   * Quản lý xác nhận hoàn tất đơn hàng (sau khi hoàn thành bước lắp đặt)
   */
  async confirmOrderCompletion(
    orderId: number,
    employeeId: number,
    note?: string
  ): Promise<{ success: boolean; message: string; order?: MisaSaOrder }> {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
      relations: ['roleGroups', 'user'],
    });

    if (!employee) {
      return { success: false, message: 'Không tìm thấy thông tin nhân viên' };
    }

    console.log(employee);

    const isInTargetGroup = employee.roleGroups?.some(
      group => String(group.id) === '1'
    );

    // Kiểm tra quyền (có thể là quản lý hoặc người có quyền giao việc)
    if (
      !hasEmployeePermission(employee, EMPLOYEE_PERMISSION.ASSIGN_ORDER_TASK) &&
      !isInTargetGroup
    ) {
      return {
        success: false,
        message: 'Bạn không có quyền xác nhận hoàn tất đơn hàng.',
      };
    }

    const order = await this.saOrderRepository.findOne({
      where: { id: orderId, deletedAt: IsNull() },
    });

    if (!order) {
      return { success: false, message: 'Không tìm thấy đơn hàng' };
    }

    // Chỉ cho phép xác nhận từ trạng thái pending_completion
    if (
      order.orderWorkflowStatus !== ORDER_WORKFLOW_STATUS.PENDING_COMPLETION
    ) {
      return {
        success: false,
        message: `Không thể xác nhận hoàn tất đơn hàng ở trạng thái "${
          ORDER_WORKFLOW_STATUS_LABELS[order.orderWorkflowStatus] ||
          order.orderWorkflowStatus
        }"`,
      };
    }

    const fromStatus = order.orderWorkflowStatus;
    const toStatus = ORDER_WORKFLOW_STATUS.COMPLETED;
    const employeeName = this.getEmployeeName(employee);

    // Cập nhật trạng thái
    await this.saOrderRepository.update(orderId, {
      orderWorkflowStatus: toStatus,
    });

    // Ghi lịch sử workflow
    await this.recordWorkflowHistory({
      orderId,
      action: WORKFLOW_ACTION.COMPLETE_ORDER || 'complete_order',
      fromStatus,
      toStatus,
      performedByEmployeeId: employeeId,
      performedByName: employeeName,
      notes: note || null,
    });

    const updatedOrder = await this.saOrderRepository.findOne({
      where: { id: orderId },
    });

    // Gửi thông báo cho Sale Admin và workflow subscribers
    if (updatedOrder) {
      await this.notificationHelper.notifyOrderCompleted(
        updatedOrder,
        employeeName
      );
    }

    return {
      success: true,
      message: 'Xác nhận hoàn tất đơn hàng thành công',
      order: updatedOrder || undefined,
    };
  }

  /**
   * Tạo PurchaseRequisition cho đơn hàng cần đặt thêm hàng
   * DXMH được tạo từ đơn hàng sẽ được auto-approve (vì BGĐ đã duyệt đơn hàng)
   */
  private async createPurchaseRequisitionForOrder(
    order: MisaSaOrder,
    employeeId: number,
    factoryId: number,
    notes: string
  ): Promise<PurchaseRequisition | undefined> {
    try {
      // Kiểm tra đã có đề xuất chưa (cả pending và approved)
      const existing = await this.purchaseRequisitionRepository.findOne({
        where: { misaSaOrderId: order.id },
      });

      if (existing) {
        this.logger.warn(
          `Đề xuất mua hàng đã tồn tại cho đơn hàng ${order.refNo}`
        );
        return existing;
      }

      // Tạo số đề xuất
      const requisitionNumber = `ĐXMH-${order.refNo}`;

      // Tạo đề xuất mua hàng - auto-approve vì BGĐ đã duyệt đơn hàng
      const requisition = this.purchaseRequisitionRepository.create({
        requisitionNumber,
        misaSaOrderId: order.id,
        misaOrderId: null,
        factoryId,
        notes,
        createdByEmployeeId: employeeId,
        status: 'approved', // Auto-approve khi tạo từ đơn hàng
        approvedByEmployeeId: employeeId, // BGĐ duyệt đơn hàng cũng là người duyệt DXMH
        approvedAt: new Date(),
        approvalNotes: `Tự động duyệt khi BGĐ duyệt đơn hàng ${order.refNo}`,
      });

      const saved = await this.purchaseRequisitionRepository.save(requisition);

      this.logger.log(
        `Đã tạo và tự động duyệt đề xuất mua hàng ${requisitionNumber} cho đơn hàng ${order.refNo}`
      );
      return saved;
    } catch (error: any) {
      this.logger.error(
        `Lỗi tạo đề xuất mua hàng cho đơn ${order.refNo}: ${error.message}`
      );
      return undefined;
    }
  }

  /**
   * Lấy danh sách đơn hàng theo trạng thái workflow
   */
  async getSaOrdersByWorkflowStatus(
    status: string,
    page = 1,
    limit = 50
  ): Promise<{ data: MisaSaOrder[]; total: number }> {
    const queryBuilder = this.saOrderRepository
      .createQueryBuilder('order')
      .where('order.deletedAt IS NULL')
      .andWhere('order.orderWorkflowStatus = :status', { status });

    queryBuilder
      .orderBy('order.refDate', 'DESC')
      .addOrderBy('order.refNo', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total };
  }
}
