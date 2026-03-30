/**
 * Các loại notification types để xác định deep linking
 */
export const NOTIFICATION_TYPE = {
  // Leave Request notifications
  LEAVE_REQUEST_CREATED: 'leave_request_created',
  LEAVE_REQUEST_APPROVED: 'leave_request_approved',
  LEAVE_REQUEST_REJECTED: 'leave_request_rejected',
  LEAVE_REQUEST_CANCELLED: 'leave_request_cancelled',
  LEAVE_REQUEST_REMINDER: 'leave_request_reminder',

  // Overtime notifications
  OVERTIME_CREATED: 'overtime_created',
  OVERTIME_APPROVED: 'overtime_approved',
  OVERTIME_REJECTED: 'overtime_rejected',
  OVERTIME_REMINDER: 'overtime_reminder',

  // Employee Feedback notifications
  EMPLOYEE_FEEDBACK_CREATED: 'employee_feedback_created',
  EMPLOYEE_FEEDBACK_REPLIED: 'employee_feedback_replied',

  // Arrival Report notifications
  ARRIVAL_REPORT_CREATED: 'arrival_report_created',

  // Overnight Report notifications (Báo cáo qua đêm)
  OVERNIGHT_REPORT_CREATED: 'overnight_report_created',

  // Maintenance Report notifications
  MAINTENANCE_REPORT_CREATED: 'maintenance_report_created',
  MAINTENANCE_REPORT_ASSIGNED: 'maintenance_report_assigned',
  MAINTENANCE_REPORT_RESOLVED: 'maintenance_report_resolved',
  MAINTENANCE_REPORT_REASSIGNED: 'maintenance_report_reassigned',

  // MISA Order notifications
  MISA_ORDER_CREATED: 'misa_order_created',
  MISA_ORDER_APPROVED: 'misa_order_approved',
  MISA_ORDER_REJECTED: 'misa_order_rejected',
  MISA_ORDER_ASSIGNED: 'misa_order_assigned',
  MISA_ORDER_STATUS_UPDATED: 'misa_order_status_updated',
  MISA_ORDER_COMPLETED: 'misa_order_completed',

  // MISA Sales Order (MisaSaOrder) notifications
  MISA_SA_ORDER_SUBMITTED: 'misa_sa_order_submitted', // Đơn hàng được gửi duyệt
  MISA_SA_ORDER_APPROVED: 'misa_sa_order_approved', // Đơn hàng được duyệt
  MISA_SA_ORDER_REJECTED: 'misa_sa_order_rejected', // Đơn hàng bị từ chối
  MISA_SA_ORDER_PAUSED: 'misa_sa_order_paused', // Đơn hàng bị tạm dừng
  MISA_SA_ORDER_RESUMED: 'misa_sa_order_resumed', // Đơn hàng được tiếp tục
  MISA_SA_ORDER_TASK_ASSIGNED: 'misa_sa_order_task_assigned', // Được giao việc trong đơn hàng
  MISA_SA_ORDER_STATUS_CHANGED: 'misa_sa_order_status_changed', // Trạng thái đơn hàng thay đổi
  MISA_SA_ORDER_UPDATED: 'misa_sa_order_updated', // Thông tin đơn hàng được cập nhật (đặt thêm hàng)

  // MISA Purchase Order (MisaPuOrder) notifications
  MISA_PU_ORDER_WAITING_GOODS: 'misa_pu_order_waiting_goods', // Đơn mua hàng đang chờ hàng về
  MISA_PU_ORDER_GOODS_ARRIVED: 'misa_pu_order_goods_arrived', // Hàng từ đơn mua hàng đã về

  // Attendance Reminder notifications
  ATTENDANCE_CHECK_IN_REMINDER: 'attendance_check_in_reminder',
  ATTENDANCE_CHECK_OUT_REMINDER: 'attendance_check_out_reminder',

  // Purchase Order notifications
  PURCHASE_ORDER_CREATED: 'purchase_order_created',
  PURCHASE_ORDER_APPROVED: 'purchase_order_approved',
  PURCHASE_ORDER_RECEIVED: 'purchase_order_received',
  PURCHASE_ORDER_COMPLETED: 'purchase_order_completed',
  PURCHASE_ORDER_UPDATED: 'purchase_order_updated',

  // Purchase Requisition notifications (Đề xuất mua hàng)
  PURCHASE_REQUISITION_CREATED: 'purchase_requisition_created',
  PURCHASE_REQUISITION_APPROVED: 'purchase_requisition_approved',
  PURCHASE_REQUISITION_REJECTED: 'purchase_requisition_rejected',
  PURCHASE_REQUISITION_REVISION_REQUIRED: 'purchase_requisition_revision_required',
  PURCHASE_REQUISITION_RESUBMITTED: 'purchase_requisition_resubmitted',
  PURCHASE_REQUISITION_PURCHASE_CONFIRMED: 'purchase_requisition_purchase_confirmed', // Xác nhận đã mua hàng

  // Support Request notifications (Yêu cầu hỗ trợ)
  SUPPORT_REQUEST_CREATED: 'support_request_created',
  SUPPORT_REQUEST_DECIDED: 'support_request_decided',
  SUPPORT_REQUEST_REMINDER: 'support_request_reminder',

  // General Request notifications (Yêu cầu chung)
  GENERAL_REQUEST_CREATED: 'general_request_created',
  GENERAL_REQUEST_APPROVED: 'general_request_approved',
  GENERAL_REQUEST_REJECTED: 'general_request_rejected',

  // Thêm các types khác khi cần
  // SALARY_UPDATED: 'salary_updated',
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];
