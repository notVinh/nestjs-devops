import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Employee } from 'src/employee/entities/employee.entity';
import { NotificationService } from 'src/notification/notification.service';
import { NOTIFICATION_TYPE } from 'src/notification/constants/notification-type.constant';
import { EMPLOYEE_PERMISSION } from 'src/employee/constants/employee-permission.constant';
import { hasEmployeePermission } from 'src/utils/employee-permissions.helper';
import { MisaSaOrder } from '../entities/misa-sa-order.entity';
import { MisaSaOrderAssignment, TASK_TYPE_LABELS, ASSIGNMENT_STATUS } from '../entities/misa-sa-order-assignment.entity';
import { MisaSaOrderTaskReport } from '../entities/misa-sa-order-task-report.entity';
import { MisaPuOrder } from '../entities/misa-pu-order.entity';

/**
 * Helper service xử lý các thông báo liên quan đến MISA
 * Tập trung logic gửi thông báo để giảm code lặp
 */
@Injectable()
export class MisaNotificationHelper {
  private readonly logger = new Logger(MisaNotificationHelper.name);

  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(MisaSaOrderAssignment)
    private readonly assignmentRepository: Repository<MisaSaOrderAssignment>,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Lấy tất cả employees với roleGroups và user
   */
  async getAllEmployeesWithRoles(): Promise<Employee[]> {
    return this.employeeRepository
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.roleGroups', 'roleGroups')
      .leftJoinAndSelect('employee.user', 'user')
      .where('employee.deletedAt IS NULL')
      .getMany();
  }

  /**
   * Lấy tên hiển thị của employee
   */
  getEmployeeName(employee: Employee): string {
    return employee.user?.fullName || employee.user?.email || `NV #${employee.id}`;
  }

  /**
   * Lấy tất cả stakeholders của đơn hàng (những người cần nhận thông báo)
   * Bao gồm: approve_order, manager, assign_order_to_warehouse, assign_order_to_technical, sale_admin
   */
  async getOrderStakeholders(
    order: MisaSaOrder,
    excludeEmployeeIds: number[] = []
  ): Promise<Employee[]> {
    const allEmployees = await this.getAllEmployeesWithRoles();

    const stakeholders = allEmployees.filter(emp => {
      // Loại trừ những người trong danh sách exclude
      if (excludeEmployeeIds.includes(emp.id)) return false;

      // Sale admin phụ trách đơn hàng
      if (emp.id === order.saleAdminId) return true;

      // Người có quyền liên quan đến đơn hàng
      return (
        hasEmployeePermission(emp, EMPLOYEE_PERMISSION.APPROVE_ORDER) ||
        hasEmployeePermission(emp, EMPLOYEE_PERMISSION.MANAGER) ||
        hasEmployeePermission(emp, EMPLOYEE_PERMISSION.ASSIGN_ORDER_TO_WAREHOUSE) ||
        hasEmployeePermission(emp, EMPLOYEE_PERMISSION.ASSIGN_ORDER_TO_TECHNICAL)
      );
    });

    return stakeholders;
  }

  /**
   * Gửi thông báo cho nhiều người - batch và xử lý lỗi
   */
  async sendBatchNotifications(
    recipients: Employee[],
    title: string,
    body: string,
    type: string,
    referenceId: number,
    metadata?: Record<string, any>
  ): Promise<{ sent: number; total: number }> {
    const notifications = recipients
      .filter(r => r.userId)
      .map(r =>
        this.notificationService.sendNotificationToUser(
          r.userId!,
          title,
          body,
          type,
          referenceId,
          metadata
        )
      );

    const results = await Promise.allSettled(notifications);
    const sent = results.filter(r => r.status === 'fulfilled').length;

    return { sent, total: recipients.length };
  }

  /**
   * Gửi thông báo khi có đơn hàng mới cần duyệt (cho BGD)
   */
  async notifyApproversAboutNewOrder(
    order: MisaSaOrder,
    submittedBy: Employee
  ): Promise<void> {
    try {
      const allEmployees = await this.getAllEmployeesWithRoles();
      const approvers = allEmployees.filter(emp =>
        hasEmployeePermission(emp, EMPLOYEE_PERMISSION.APPROVE_ORDER)
      );

      if (approvers.length === 0) {
        this.logger.warn('Không tìm thấy nhân viên có quyền duyệt đơn hàng');
        return;
      }

      const submitterName = this.getEmployeeName(submittedBy);
      const additionalOrderInfo = order.needsAdditionalOrder
        ? `\n⚠️ Cần đặt thêm hàng: ${order.additionalOrderNote || 'Không có ghi chú'}`
        : '';

      const { sent } = await this.sendBatchNotifications(
        approvers,
        `Đơn hàng ${order.refNo} cần duyệt`,
        `${submitterName} đã gửi đơn hàng ${order.refNo} để duyệt.\nKhách hàng: ${order.accountObjectName || 'Không xác định'}${additionalOrderInfo}\nNhấn để xem chi tiết`,
        NOTIFICATION_TYPE.MISA_SA_ORDER_SUBMITTED,
        order.id,
        {
          orderId: order.id,
          refNo: order.refNo,
          customerName: order.accountObjectName,
          submittedBy: submitterName,
          submittedAt: new Date().toISOString(),
          needsAdditionalOrder: order.needsAdditionalOrder,
          additionalOrderNote: order.additionalOrderNote,
        }
      );

      this.logger.log(`Đã gửi ${sent}/${approvers.length} thông báo cho BGĐ về đơn hàng ${order.refNo}`);
    } catch (error: any) {
      this.logger.error(`Lỗi gửi thông báo cho người duyệt: ${error.message}`);
    }
  }

  /**
   * Gửi thông báo cho Sale Admin khi đơn được duyệt/từ chối
   */
  async notifySaleAdminAboutApproval(
    order: MisaSaOrder,
    approved: boolean,
    approverName: string,
    note?: string,
    purchaseRequisitionCreated?: boolean
  ): Promise<void> {
    if (!order.saleAdminId) return;

    try {
      const saleAdmin = await this.employeeRepository.findOne({
        where: { id: order.saleAdminId },
        relations: ['user'],
      });

      if (!saleAdmin?.userId) return;

      const statusText = approved ? 'đã được duyệt' : 'đã bị từ chối';
      const additionalInfo = approved && purchaseRequisitionCreated
        ? '\nĐã tạo đề xuất mua hàng và thông báo cho bộ phận mua hàng.'
        : '';

      await this.notificationService.sendNotificationToUser(
        saleAdmin.userId,
        `Đơn hàng ${order.refNo} ${statusText}`,
        `${approverName} ${statusText} đơn hàng ${order.refNo}.${note ? `\nGhi chú: ${note}` : ''}${additionalInfo}\nNhấn để xem chi tiết`,
        approved ? NOTIFICATION_TYPE.MISA_SA_ORDER_APPROVED : NOTIFICATION_TYPE.MISA_SA_ORDER_REJECTED,
        order.id,
        {
          orderId: order.id,
          refNo: order.refNo,
          approved,
          approvedBy: approverName,
          note,
          purchaseRequisitionCreated,
        }
      );
    } catch (error: any) {
      this.logger.error(`Lỗi gửi thông báo cho Sale Admin: ${error.message}`);
    }
  }

  /**
   * Gửi thông báo cho workflow subscribers khi đơn được duyệt
   */
  async notifyOrderWorkflowSubscribers(
    order: MisaSaOrder,
    approverName: string,
    note?: string
  ): Promise<void> {
    try {
      const allEmployees = await this.getAllEmployeesWithRoles();
      const subscribers = allEmployees.filter(emp =>
        hasEmployeePermission(emp, EMPLOYEE_PERMISSION.RECEIVE_ORDER_WORKFLOW_NOTIFICATION) &&
        emp.id !== order.saleAdminId
      );

      if (subscribers.length === 0) return;

      const body = [
        `BGĐ ${approverName} đã duyệt đơn hàng ${order.refNo}.`,
        `Khách hàng: ${order.accountObjectName || 'Không xác định'}`,
        note ? `Ghi chú: ${note}` : null,
        'Nhấn để xem chi tiết',
      ].filter(Boolean).join('\n');

      const { sent } = await this.sendBatchNotifications(
        subscribers,
        `Đơn hàng ${order.refNo} đã được duyệt`,
        body,
        NOTIFICATION_TYPE.MISA_SA_ORDER_APPROVED,
        order.id,
        {
          orderId: order.id,
          refNo: order.refNo,
          customerName: order.accountObjectName,
          approved: true,
          approvedBy: approverName,
          note,
        }
      );

      this.logger.log(`Đã gửi ${sent}/${subscribers.length} thông báo workflow cho subscribers`);
    } catch (error: any) {
      this.logger.error(`Lỗi gửi thông báo workflow: ${error.message}`);
    }
  }

  /**
   * Gửi thông báo cho bộ phận mua hàng khi có ĐXMH được duyệt (auto-approve từ đơn hàng)
   * Nhân viên nhận được thông báo này sẽ là người xác nhận đã mua hàng
   */
  async notifyPurchasingStaffAboutNewRequisition(
    order: MisaSaOrder,
    approverName: string
  ): Promise<void> {
    try {
      const allEmployees = await this.getAllEmployeesWithRoles();
      const purchasingStaff = allEmployees.filter(emp =>
        hasEmployeePermission(emp, EMPLOYEE_PERMISSION.RECEIVE_NOTIFICATION_OF_PURCHASE_REQUISITION)
      );

      if (purchasingStaff.length === 0) {
        this.logger.warn('Không tìm thấy nhân viên bộ phận mua hàng');
        return;
      }

      const { sent } = await this.sendBatchNotifications(
        purchasingStaff,
        `Đề xuất mua hàng cần xác nhận - ${order.refNo}`,
        `BGĐ ${approverName} đã duyệt đơn hàng ${order.refNo} và tạo đề xuất mua hàng.\nKhách hàng: ${order.accountObjectName || 'Không xác định'}\nGhi chú: ${order.additionalOrderNote || 'Không có ghi chú'}\nVui lòng xác nhận khi đã hoàn thành mua hàng.`,
        NOTIFICATION_TYPE.PURCHASE_REQUISITION_APPROVED,
        order.id,
        {
          orderId: order.id,
          refNo: order.refNo,
          customerName: order.accountObjectName,
          approvedBy: approverName,
          additionalOrderNote: order.additionalOrderNote,
        }
      );

      this.logger.log(`Đã gửi ${sent}/${purchasingStaff.length} thông báo ĐXMH đã duyệt cho bộ phận mua hàng`);
    } catch (error: any) {
      this.logger.error(`Lỗi gửi thông báo ĐXMH: ${error.message}`);
    }
  }

  /**
   * Gửi thông báo khi thay đổi thông tin đặt thêm hàng
   */
  async notifyAdditionalOrderChange(
    order: MisaSaOrder,
    updatedByName?: string
  ): Promise<void> {
    try {
      const allEmployees = await this.getAllEmployeesWithRoles();
      const recipients = allEmployees.filter(emp =>
        hasEmployeePermission(emp, EMPLOYEE_PERMISSION.APPROVE_ORDER) ||
        hasEmployeePermission(emp, EMPLOYEE_PERMISSION.RECEIVE_NOTIFICATION_OF_PURCHASE_REQUISITION)
      );

      if (recipients.length === 0) {
        this.logger.warn('Không tìm thấy người nhận thông báo thay đổi đặt thêm hàng');
        return;
      }

      const statusText = order.needsAdditionalOrder ? 'Cần đặt thêm hàng' : 'Không cần đặt thêm hàng';
      const updatedBy = updatedByName || 'Nhân viên';

      const { sent } = await this.sendBatchNotifications(
        recipients,
        `Cập nhật đơn hàng ${order.refNo}`,
        `${updatedBy} đã cập nhật thông tin đặt thêm hàng.\nTrạng thái: ${statusText}${order.additionalOrderNote ? `\nGhi chú: ${order.additionalOrderNote}` : ''}\nKhách hàng: ${order.accountObjectName || 'Không xác định'}`,
        NOTIFICATION_TYPE.MISA_SA_ORDER_UPDATED,
        order.id,
        {
          orderId: order.id,
          refNo: order.refNo,
          needsAdditionalOrder: order.needsAdditionalOrder,
          additionalOrderNote: order.additionalOrderNote,
          updatedBy,
        }
      );

      this.logger.log(`Đã gửi ${sent}/${recipients.length} thông báo cập nhật đặt thêm hàng cho đơn ${order.refNo}`);
    } catch (error: any) {
      this.logger.error(`Lỗi gửi thông báo cập nhật đặt thêm hàng: ${error.message}`);
    }
  }

  /**
   * Gửi thông báo khi được giao việc
   */
  async notifyAssignedEmployee(
    order: MisaSaOrder,
    assignment: MisaSaOrderAssignment,
    assignedTo: Employee,
    assignedByName: string
  ): Promise<void> {
    if (!assignedTo.userId) return;

    try {
      const taskTypeLabel = TASK_TYPE_LABELS[assignment.taskType] || assignment.taskType;
      const scheduledInfo = assignment.scheduledAt
        ? `\nThời gian dự kiến: ${new Date(assignment.scheduledAt).toLocaleString('vi-VN')}`
        : '';
      const notesInfo = assignment.notes ? `\nGhi chú: ${assignment.notes}` : '';

      await this.notificationService.sendNotificationToUser(
        assignedTo.userId,
        `Bạn được giao việc: ${taskTypeLabel}`,
        `Đơn hàng: ${order.refNo}\nKhách hàng: ${order.accountObjectName || 'Không xác định'}\nNgười giao: ${assignedByName}${scheduledInfo}${notesInfo}\nNhấn để xem chi tiết`,
        NOTIFICATION_TYPE.MISA_SA_ORDER_TASK_ASSIGNED,
        order.id,
        {
          orderId: order.id,
          refNo: order.refNo,
          taskType: assignment.taskType,
          assignmentId: assignment.id,
        }
      );
    } catch (error: any) {
      this.logger.error(`Lỗi gửi thông báo giao việc: ${error.message}`);
    }
  }

  /**
   * Gửi thông báo cho workflow subscribers khi giao việc
   * Hiển thị TẤT CẢ những người được giao việc cùng taskType cho đơn hàng
   */
  async notifyWorkflowSubscribersAboutAssignment(
    order: MisaSaOrder,
    assignment: MisaSaOrderAssignment,
    assignedByName: string,
    assignedToName: string
  ): Promise<void> {
    try {
      // Lấy TẤT CẢ assignments cùng taskType cho đơn hàng này (PENDING hoặc IN_PROGRESS)
      const allAssignmentsForTask = await this.assignmentRepository.find({
        where: {
          orderId: order.id,
          taskType: assignment.taskType,
          status: In([ASSIGNMENT_STATUS.PENDING, ASSIGNMENT_STATUS.IN_PROGRESS]),
          deletedAt: IsNull(),
        },
      });

      // Lấy danh sách tất cả người được giao (loại bỏ trùng lặp theo assignedToId)
      const assigneeMap = new Map<number, string>();
      for (const a of allAssignmentsForTask) {
        if (!assigneeMap.has(a.assignedToId)) {
          assigneeMap.set(a.assignedToId, a.assignedToName || `NV #${a.assignedToId}`);
        }
      }
      const allAssigneeNames = Array.from(assigneeMap.values());
      const allAssigneeIds = Array.from(assigneeMap.keys());

      // Lấy stakeholders, loại trừ tất cả người được giao và người giao
      const excludeIds = [...allAssigneeIds, assignment.assignedById];
      const recipients = await this.getOrderStakeholders(order, excludeIds);

      if (recipients.length === 0) return;

      const taskTypeLabel = TASK_TYPE_LABELS[assignment.taskType] || assignment.taskType;

      // Format danh sách người được giao
      const assigneeListText = allAssigneeNames.length > 1
        ? allAssigneeNames.join(', ')
        : assignedToName;

      const body = [
        `${assignedByName} đã giao việc "${taskTypeLabel}" cho: ${assigneeListText}`,
        `Đơn hàng: ${order.refNo}`,
        `Khách hàng: ${order.accountObjectName || 'Không xác định'}`,
        allAssigneeNames.length > 1 ? `Số người thực hiện: ${allAssigneeNames.length}` : null,
        assignment.scheduledAt ? `Thời gian dự kiến: ${new Date(assignment.scheduledAt).toLocaleString('vi-VN')}` : null,
        'Nhấn để xem chi tiết',
      ].filter(Boolean).join('\n');

      await this.sendBatchNotifications(
        recipients,
        `Giao việc: ${taskTypeLabel} - ${order.refNo}`,
        body,
        NOTIFICATION_TYPE.MISA_SA_ORDER_STATUS_CHANGED,
        order.id,
        {
          orderId: order.id,
          refNo: order.refNo,
          taskType: assignment.taskType,
          assignmentId: assignment.id,
          allAssigneeNames,
        }
      );
    } catch (error: any) {
      this.logger.error(`Lỗi gửi thông báo giao việc: ${error.message}`);
    }
  }

  /**
   * Gửi thông báo khi nhân viên bắt đầu thực hiện công việc
   */
  async notifyWorkflowSubscribersAboutTaskStart(
    order: MisaSaOrder,
    assignment: MisaSaOrderAssignment,
    startedByName: string
  ): Promise<void> {
    try {
      // Lấy stakeholders, loại trừ người bắt đầu
      const recipients = await this.getOrderStakeholders(order, [assignment.assignedToId]);

      if (recipients.length === 0) return;

      const taskTypeLabel = TASK_TYPE_LABELS[assignment.taskType] || assignment.taskType;
      const body = [
        `${startedByName} đã bắt đầu thực hiện "${taskTypeLabel}"`,
        `Đơn hàng: ${order.refNo}`,
        `Khách hàng: ${order.accountObjectName || 'Không xác định'}`,
        'Nhấn để xem chi tiết',
      ].filter(Boolean).join('\n');

      const { sent } = await this.sendBatchNotifications(
        recipients,
        `Bắt đầu: ${taskTypeLabel} - ${order.refNo}`,
        body,
        NOTIFICATION_TYPE.MISA_SA_ORDER_STATUS_CHANGED,
        order.id,
        {
          orderId: order.id,
          refNo: order.refNo,
          taskType: assignment.taskType,
          assignmentId: assignment.id,
          action: 'start',
        }
      );

      this.logger.log(`Đã gửi ${sent}/${recipients.length} thông báo bắt đầu công việc cho đơn ${order.refNo}`);
    } catch (error: any) {
      this.logger.error(`Lỗi gửi thông báo bắt đầu công việc: ${error.message}`);
    }
  }

  /**
   * Gửi thông báo khi hoàn thành/chưa hoàn thành công việc
   */
  async notifyWorkflowSubscribersAboutTaskCompletion(
    order: MisaSaOrder,
    assignment: MisaSaOrderAssignment,
    completedByName: string,
    isCompleted: boolean,
    incompleteReason?: string
  ): Promise<void> {
    try {
      // Lấy stakeholders, loại trừ người thực hiện
      const recipients = await this.getOrderStakeholders(order, [assignment.assignedToId]);

      if (recipients.length === 0) return;

      const taskTypeLabel = TASK_TYPE_LABELS[assignment.taskType] || assignment.taskType;
      const statusText = isCompleted ? 'Hoàn thành' : 'Chưa hoàn thành';
      const body = [
        `${completedByName} đã báo cáo ${statusText.toLowerCase()} "${taskTypeLabel}"`,
        `Đơn hàng: ${order.refNo}`,
        `Khách hàng: ${order.accountObjectName || 'Không xác định'}`,
        !isCompleted && incompleteReason ? `Lý do: ${incompleteReason}` : null,
        'Nhấn để xem chi tiết',
      ].filter(Boolean).join('\n');

      await this.sendBatchNotifications(
        recipients,
        `${statusText}: ${taskTypeLabel} - ${order.refNo}`,
        body,
        NOTIFICATION_TYPE.MISA_SA_ORDER_STATUS_CHANGED,
        order.id,
        {
          orderId: order.id,
          refNo: order.refNo,
          taskType: assignment.taskType,
          assignmentId: assignment.id,
          isCompleted,
        }
      );
    } catch (error: any) {
      this.logger.error(`Lỗi gửi thông báo hoàn thành: ${error.message}`);
    }
  }

  /**
   * Gửi thông báo khi có báo cáo tiến độ hàng ngày
   */
  async notifyWorkflowSubscribersAboutDailyReport(
    order: MisaSaOrder,
    assignment: MisaSaOrderAssignment,
    report: MisaSaOrderTaskReport,
    reportedByName: string
  ): Promise<void> {
    try {
      // Lấy stakeholders, loại trừ người báo cáo
      const recipients = await this.getOrderStakeholders(order, [report.reportedById]);

      if (recipients.length === 0) return;

      const taskTypeLabel = TASK_TYPE_LABELS[assignment.taskType] || assignment.taskType;
      const body = [
        `${reportedByName} đã báo cáo tiến độ "${taskTypeLabel}"`,
        `Đơn hàng: ${order.refNo}`,
        report.progressPercent !== null ? `Tiến độ: ${report.progressPercent}%` : null,
        `Nội dung: ${report.description.substring(0, 100)}${report.description.length > 100 ? '...' : ''}`,
        report.blockedReason ? `Vấn đề: ${report.blockedReason}` : null,
        'Nhấn để xem chi tiết',
      ].filter(Boolean).join('\n');

      await this.sendBatchNotifications(
        recipients,
        `Báo cáo tiến độ: ${taskTypeLabel} - ${order.refNo}`,
        body,
        NOTIFICATION_TYPE.MISA_SA_ORDER_STATUS_CHANGED,
        order.id,
        {
          orderId: order.id,
          refNo: order.refNo,
          taskType: assignment.taskType,
          assignmentId: assignment.id,
          reportId: report.id,
        }
      );
    } catch (error: any) {
      this.logger.error(`Lỗi gửi thông báo báo cáo: ${error.message}`);
    }
  }

  /**
   * Gửi thông báo khi giao lại công việc
   */
  async notifyReassignedEmployee(
    order: MisaSaOrder,
    newAssignment: MisaSaOrderAssignment,
    newAssignedTo: Employee,
    reassignByName: string,
    oldAssignedToName: string
  ): Promise<void> {
    if (!newAssignedTo.userId) return;

    try {
      const taskTypeLabel = TASK_TYPE_LABELS[newAssignment.taskType] || newAssignment.taskType;

      await this.notificationService.sendNotificationToUser(
        newAssignedTo.userId,
        `Bạn được giao việc: ${taskTypeLabel}`,
        `Đơn hàng: ${order.refNo}\nKhách hàng: ${order.accountObjectName || 'Không xác định'}\nNgười giao: ${reassignByName}\n(Giao lại từ ${oldAssignedToName})\nNhấn để xem chi tiết`,
        NOTIFICATION_TYPE.MISA_SA_ORDER_TASK_ASSIGNED,
        order.id,
        {
          orderId: order.id,
          refNo: order.refNo,
          taskType: newAssignment.taskType,
          assignmentId: newAssignment.id,
          isReassign: true,
        }
      );
    } catch (error: any) {
      this.logger.error(`Lỗi gửi thông báo giao lại việc: ${error.message}`);
    }
  }

  /**
   * Gửi thông báo khi đơn hàng hoàn tất
   */
  async notifyOrderCompleted(
    order: MisaSaOrder,
    confirmedByName: string
  ): Promise<void> {
    try {
      // Gửi cho tất cả stakeholders của đơn hàng
      const recipients = await this.getOrderStakeholders(order);

      if (recipients.length === 0) return;

      const body = [
        `${confirmedByName} đã xác nhận hoàn tất đơn hàng ${order.refNo}.`,
        `Khách hàng: ${order.accountObjectName || 'Không xác định'}`,
        'Đơn hàng đã hoàn thành toàn bộ quy trình.',
      ].join('\n');

      const { sent } = await this.sendBatchNotifications(
        recipients,
        `Đơn hàng ${order.refNo} đã hoàn tất`,
        body,
        NOTIFICATION_TYPE.MISA_SA_ORDER_STATUS_CHANGED,
        order.id,
        {
          orderId: order.id,
          refNo: order.refNo,
          status: 'completed',
          confirmedBy: confirmedByName,
        }
      );

      this.logger.log(`Đã gửi ${sent}/${recipients.length} thông báo hoàn tất đơn hàng ${order.refNo}`);
    } catch (error: any) {
      this.logger.error(`Lỗi gửi thông báo hoàn tất đơn: ${error.message}`);
    }
  }

  /**
   * Gửi thông báo cho quản lý khi bước tiếp theo sẵn sàng để giao việc
   */
  async notifyNextStepReady(
    order: MisaSaOrder,
    nextStepLabel: string,
    completedStepLabel: string,
    completedByName: string
  ): Promise<void> {
    try {
      const allEmployees = await this.getAllEmployeesWithRoles();

      // Gửi cho người có quyền giao việc
      const recipients = allEmployees.filter(emp =>
        hasEmployeePermission(emp, EMPLOYEE_PERMISSION.ASSIGN_ORDER_TASK)
      );

      if (recipients.length === 0) {
        this.logger.warn('Không tìm thấy người có quyền giao việc');
        return;
      }

      const body = [
        `${completedByName} đã hoàn thành "${completedStepLabel}" cho đơn hàng ${order.refNo}.`,
        `Khách hàng: ${order.accountObjectName || 'Không xác định'}`,
        `Bước tiếp theo: ${nextStepLabel}`,
        'Vui lòng giao việc cho nhân viên để tiếp tục.',
      ].join('\n');

      const { sent } = await this.sendBatchNotifications(
        recipients,
        `Sẵn sàng ${nextStepLabel} - ${order.refNo}`,
        body,
        NOTIFICATION_TYPE.MISA_SA_ORDER_STATUS_CHANGED,
        order.id,
        {
          orderId: order.id,
          refNo: order.refNo,
          nextStep: nextStepLabel,
          completedStep: completedStepLabel,
        }
      );

      this.logger.log(`Đã gửi ${sent}/${recipients.length} thông báo sẵn sàng ${nextStepLabel} cho đơn ${order.refNo}`);
    } catch (error: any) {
      this.logger.error(`Lỗi gửi thông báo bước tiếp theo: ${error.message}`);
    }
  }

  /**
   * Gửi thông báo chờ xác nhận hoàn tất đơn hàng
   */
  async notifyPendingCompletion(
    order: MisaSaOrder,
    completedByName: string
  ): Promise<void> {
    try {
      const allEmployees = await this.getAllEmployeesWithRoles();

      // Gửi cho người có quyền giao việc (quản lý)
      const recipients = allEmployees.filter(emp =>
        hasEmployeePermission(emp, EMPLOYEE_PERMISSION.ASSIGN_ORDER_TASK)
      );

      if (recipients.length === 0) return;

      const body = [
        `${completedByName} đã hoàn thành bước lắp đặt - bước cuối cùng của đơn hàng ${order.refNo}.`,
        `Khách hàng: ${order.accountObjectName || 'Không xác định'}`,
        'Vui lòng kiểm tra và xác nhận hoàn tất đơn hàng.',
      ].join('\n');

      const { sent } = await this.sendBatchNotifications(
        recipients,
        `Chờ xác nhận hoàn tất - ${order.refNo}`,
        body,
        NOTIFICATION_TYPE.MISA_SA_ORDER_STATUS_CHANGED,
        order.id,
        {
          orderId: order.id,
          refNo: order.refNo,
          status: 'pending_completion',
        }
      );

      this.logger.log(`Đã gửi ${sent}/${recipients.length} thông báo chờ xác nhận hoàn tất cho đơn ${order.refNo}`);
    } catch (error: any) {
      this.logger.error(`Lỗi gửi thông báo chờ xác nhận: ${error.message}`);
    }
  }

  /**
   * Gửi thông báo khi đơn mua hàng (PU Order) đang chờ hàng về
   * Gửi cho Sale Admin phụ trách đơn bán hàng liên quan và các nhân viên có quyền:
   * approve_order, manager, assign_order_to_warehouse, assign_order_to_technical
   */
  async notifyPuOrderWaitingGoods(
    puOrder: MisaPuOrder,
    saOrder: MisaSaOrder | null,
    updatedByName: string
  ): Promise<void> {
    try {
      const allEmployees = await this.getAllEmployeesWithRoles();

      // Lấy danh sách người nhận: Sale Admin + employees với specific permissions
      const recipients = allEmployees.filter(emp => {
        // Sale admin phụ trách đơn bán hàng liên quan
        if (saOrder && emp.id === saOrder.saleAdminId) return true;

        // Người có quyền liên quan
        return (
          hasEmployeePermission(emp, EMPLOYEE_PERMISSION.APPROVE_ORDER) ||
          hasEmployeePermission(emp, EMPLOYEE_PERMISSION.MANAGER) ||
          hasEmployeePermission(emp, EMPLOYEE_PERMISSION.ASSIGN_ORDER_TO_WAREHOUSE) ||
          hasEmployeePermission(emp, EMPLOYEE_PERMISSION.ASSIGN_ORDER_TO_TECHNICAL)
        );
      });

      if (recipients.length === 0) {
        this.logger.warn('Không tìm thấy người nhận thông báo chờ hàng về cho đơn mua hàng');
        return;
      }

      // Format ngày dự kiến
      const expectedDate = puOrder.expectedArrivalDate
        ? new Date(puOrder.expectedArrivalDate).toLocaleDateString('vi-VN')
        : 'Chưa xác định';

      // Build message body
      const bodyParts = [
        `Đơn mua hàng ${puOrder.refNo} đang chờ hàng về.`,
        `Nhà cung cấp: ${puOrder.accountObjectName || 'Không xác định'}`,
        `Ngày dự kiến: ${expectedDate}`,
        `Cập nhật bởi: ${updatedByName}`,
      ];

      if (saOrder) {
        bodyParts.push(`Liên quan đến đơn bán hàng: ${saOrder.refNo} - ${saOrder.accountObjectName || ''}`);
      }

      bodyParts.push('Nhấn để xem chi tiết');

      const { sent } = await this.sendBatchNotifications(
        recipients,
        `Chờ hàng về - ${puOrder.refNo}`,
        bodyParts.join('\n'),
        NOTIFICATION_TYPE.MISA_PU_ORDER_WAITING_GOODS,
        puOrder.id,
        {
          puOrderId: puOrder.id,
          puOrderRefNo: puOrder.refNo,
          supplierName: puOrder.accountObjectName,
          expectedArrivalDate: puOrder.expectedArrivalDate?.toString() || null,
          saOrderId: saOrder?.id || null,
          saOrderRefNo: saOrder?.refNo || null,
          updatedBy: updatedByName,
        }
      );

      this.logger.log(`Đã gửi ${sent}/${recipients.length} thông báo chờ hàng về cho đơn mua hàng ${puOrder.refNo}`);
    } catch (error: any) {
      this.logger.error(`Lỗi gửi thông báo chờ hàng về: ${error.message}`);
    }
  }

  /**
   * Gửi thông báo khi hàng từ đơn mua hàng (PU Order) đã về
   * Gửi cho Sale Admin phụ trách đơn bán hàng liên quan và các nhân viên có quyền:
   * approve_order, manager, assign_order_to_warehouse, assign_order_to_technical
   */
  async notifyPuOrderGoodsArrived(
    puOrder: MisaPuOrder,
    saOrder: MisaSaOrder | null,
    confirmedByName: string
  ): Promise<void> {
    try {
      const allEmployees = await this.getAllEmployeesWithRoles();

      // Lấy danh sách người nhận: Sale Admin + employees với specific permissions
      const recipients = allEmployees.filter(emp => {
        // Sale admin phụ trách đơn bán hàng liên quan
        if (saOrder && emp.id === saOrder.saleAdminId) return true;

        // Người có quyền liên quan
        return (
          hasEmployeePermission(emp, EMPLOYEE_PERMISSION.APPROVE_ORDER) ||
          hasEmployeePermission(emp, EMPLOYEE_PERMISSION.MANAGER) ||
          hasEmployeePermission(emp, EMPLOYEE_PERMISSION.ASSIGN_ORDER_TO_WAREHOUSE) ||
          hasEmployeePermission(emp, EMPLOYEE_PERMISSION.ASSIGN_ORDER_TO_TECHNICAL)
        );
      });

      if (recipients.length === 0) {
        this.logger.warn('Không tìm thấy người nhận thông báo hàng về cho đơn mua hàng');
        return;
      }

      // Build message body
      const bodyParts = [
        `Hàng từ đơn mua hàng ${puOrder.refNo} đã về.`,
        `Nhà cung cấp: ${puOrder.accountObjectName || 'Không xác định'}`,
        `Xác nhận bởi: ${confirmedByName}`,
      ];

      if (saOrder) {
        bodyParts.push(`Liên quan đến đơn bán hàng: ${saOrder.refNo} - ${saOrder.accountObjectName || ''}`);
      }

      bodyParts.push('Nhấn để xem chi tiết');

      const { sent } = await this.sendBatchNotifications(
        recipients,
        `Hàng đã về - ${puOrder.refNo}`,
        bodyParts.join('\n'),
        NOTIFICATION_TYPE.MISA_PU_ORDER_GOODS_ARRIVED,
        puOrder.id,
        {
          puOrderId: puOrder.id,
          puOrderRefNo: puOrder.refNo,
          supplierName: puOrder.accountObjectName,
          saOrderId: saOrder?.id || null,
          saOrderRefNo: saOrder?.refNo || null,
          confirmedBy: confirmedByName,
        }
      );

      this.logger.log(`Đã gửi ${sent}/${recipients.length} thông báo hàng về cho đơn mua hàng ${puOrder.refNo}`);
    } catch (error: any) {
      this.logger.error(`Lỗi gửi thông báo hàng về: ${error.message}`);
    }
  }
}
