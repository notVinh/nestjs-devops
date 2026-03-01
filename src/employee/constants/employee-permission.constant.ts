/**
 * Employee permissions constants
 * These permissions are stored in the `permissions` field of the Employee entity
 */
export const EMPLOYEE_PERMISSION = {
  // === Sales Order permissions ===
  VIEW_ALL_ORDERS: 'view_all_orders',
  SUBMIT_ORDER_FOR_APPROVAL: 'submit_order_for_approval',
  APPROVE_ORDER: 'approve_order',
  MANAGER: 'manager',
  ASSIGN_ORDER_TASK: 'assign_order_task', // Quyền giao việc cho đơn hàng (xuất kho, giao vận, lắp đặt)
  ASSIGN_ORDER_TO_WAREHOUSE: 'assign_order_to_warehouse',
  ASSIGN_ORDER_TO_TECHNICAL: 'assign_order_to_technical',
  COMPLETE_ORDER: 'complete_order',
  RECEIVE_ORDER_WORKFLOW_NOTIFICATION: 'receive_order_workflow_notification', // Nhận thông báo khi đơn hàng được duyệt/từ chối

  // === Purchase Order permissions ===
  RECEIVE_NOTIFICATION_OF_PURCHASE_REQUISITION: 'receive_notification_of_purchase_requisition', // Nhận thông báo DXMH được duyệt + xác nhận đã mua hàng
  APPROVE_PURCHASE_REQUISITION: 'approve_purchase_requisition',
  VIEW_ALL_PURCHASE_ORDERS: 'view_all_purchase_orders',
  APPROVE_PURCHASE_ORDERS: 'approve_purchase_orders',

  // === HR permissions ===
  RECEIVE_LEAVE_APPROVED_NOTIFICATION: 'receive_leave_approved_notification',
  RECEIVE_OVERTIME_APPROVED_NOTIFICATION: 'receive_overtime_approved_notification',
} as const;

export type EmployeePermission =
  (typeof EMPLOYEE_PERMISSION)[keyof typeof EMPLOYEE_PERMISSION];
