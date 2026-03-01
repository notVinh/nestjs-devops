/**
 * Các trạng thái workflow của đơn hàng
 */
export const ORDER_WORKFLOW_STATUS = {
  DRAFT: 'draft',                           // Nháp - chưa gửi duyệt
  WAITING_APPROVAL: 'waiting_approval',     // Chờ BGĐ duyệt
  REJECTED: 'rejected',                     // BGĐ từ chối
  APPROVED: 'approved',                     // BGĐ đã duyệt (deprecated, chuyển thẳng sang waiting_export)
  WAITING_EXPORT: 'waiting_export',         // Chờ giao việc xuất kho
  IN_PREPARATION: 'in_preparation',         // Đang xuất kho/chuẩn bị hàng
  WAITING_DELIVERY: 'waiting_delivery',     // Chờ giao việc giao vận
  IN_DELIVERY: 'in_delivery',               // Đang giao vận
  WAITING_INSTALLATION: 'waiting_installation', // Chờ giao việc lắp đặt
  IN_INSTALLATION: 'in_installation',       // Đang lắp đặt
  PENDING_COMPLETION: 'pending_completion', // Chờ xác nhận hoàn tất
  COMPLETED: 'completed',                   // Hoàn tất
  CANCELLED: 'cancelled',                   // Đã hủy
} as const;

export type OrderWorkflowStatus = typeof ORDER_WORKFLOW_STATUS[keyof typeof ORDER_WORKFLOW_STATUS];

/**
 * Nhãn hiển thị cho các trạng thái workflow
 */
export const ORDER_WORKFLOW_STATUS_LABELS: Record<string, string> = {
  [ORDER_WORKFLOW_STATUS.DRAFT]: 'Nháp',
  [ORDER_WORKFLOW_STATUS.WAITING_APPROVAL]: 'Chờ duyệt',
  [ORDER_WORKFLOW_STATUS.REJECTED]: 'Bị từ chối',
  [ORDER_WORKFLOW_STATUS.APPROVED]: 'Đã duyệt',
  [ORDER_WORKFLOW_STATUS.WAITING_EXPORT]: 'Chờ xuất kho',
  [ORDER_WORKFLOW_STATUS.IN_PREPARATION]: 'Đang xuất kho',
  [ORDER_WORKFLOW_STATUS.WAITING_DELIVERY]: 'Chờ giao vận',
  [ORDER_WORKFLOW_STATUS.IN_DELIVERY]: 'Đang giao vận',
  [ORDER_WORKFLOW_STATUS.WAITING_INSTALLATION]: 'Chờ lắp đặt',
  [ORDER_WORKFLOW_STATUS.IN_INSTALLATION]: 'Đang lắp đặt',
  [ORDER_WORKFLOW_STATUS.PENDING_COMPLETION]: 'Chờ xác nhận hoàn tất',
  [ORDER_WORKFLOW_STATUS.COMPLETED]: 'Hoàn tất',
  [ORDER_WORKFLOW_STATUS.CANCELLED]: 'Đã hủy',
};

/**
 * Định nghĩa các bước công việc tuần tự
 * Mỗi task type tương ứng với một cặp trạng thái (waiting → in_progress)
 * parallelWith: danh sách các taskType chạy song song cùng giai đoạn
 */
export const WORKFLOW_STEPS = {
  warehouse_export: {
    taskType: 'warehouse_export',
    label: 'Kho xuất máy',
    waitingStatus: ORDER_WORKFLOW_STATUS.WAITING_EXPORT,
    inProgressStatus: ORDER_WORKFLOW_STATUS.IN_PREPARATION,
    nextWaitingStatus: ORDER_WORKFLOW_STATUS.WAITING_DELIVERY,
    order: 1,
    parallelWith: ['technical_check'], // Chạy song song với kiểm tra kỹ thuật
  },
  technical_check: {
    taskType: 'technical_check',
    label: 'Kiểm tra kỹ thuật',
    waitingStatus: ORDER_WORKFLOW_STATUS.WAITING_EXPORT,
    inProgressStatus: ORDER_WORKFLOW_STATUS.IN_PREPARATION,
    nextWaitingStatus: ORDER_WORKFLOW_STATUS.WAITING_DELIVERY,
    order: 1, // Cùng order với warehouse_export (song song)
    parallelWith: ['warehouse_export'], // Chạy song song với xuất kho
  },
  delivery: {
    taskType: 'delivery',
    label: 'Giao vận',
    waitingStatus: ORDER_WORKFLOW_STATUS.WAITING_DELIVERY,
    inProgressStatus: ORDER_WORKFLOW_STATUS.IN_DELIVERY,
    nextWaitingStatus: ORDER_WORKFLOW_STATUS.WAITING_INSTALLATION,
    order: 2,
    parallelWith: [],
  },
  installation: {
    taskType: 'installation',
    label: 'Lắp đặt',
    waitingStatus: ORDER_WORKFLOW_STATUS.WAITING_INSTALLATION,
    inProgressStatus: ORDER_WORKFLOW_STATUS.IN_INSTALLATION,
    nextWaitingStatus: ORDER_WORKFLOW_STATUS.PENDING_COMPLETION, // Bước cuối, chờ xác nhận
    order: 3,
    parallelWith: [],
  },
} as const;

/**
 * Thứ tự các bước workflow
 */
export const WORKFLOW_STEP_ORDER: string[] = ['warehouse_export', 'delivery', 'installation'];

/**
 * Lấy bước tiếp theo dựa trên task type hiện tại
 */
export function getNextWorkflowStep(currentTaskType: string): typeof WORKFLOW_STEPS[keyof typeof WORKFLOW_STEPS] | null {
  const currentIndex = WORKFLOW_STEP_ORDER.indexOf(currentTaskType);
  if (currentIndex === -1 || currentIndex >= WORKFLOW_STEP_ORDER.length - 1) {
    return null; // Không có bước tiếp theo
  }
  const nextTaskType = WORKFLOW_STEP_ORDER[currentIndex + 1];
  return WORKFLOW_STEPS[nextTaskType as keyof typeof WORKFLOW_STEPS] || null;
}

/**
 * Lấy thông tin bước workflow theo task type
 */
export function getWorkflowStep(taskType: string): typeof WORKFLOW_STEPS[keyof typeof WORKFLOW_STEPS] | null {
  return WORKFLOW_STEPS[taskType as keyof typeof WORKFLOW_STEPS] || null;
}

/**
 * Kiểm tra đây có phải bước cuối cùng không
 */
export function isLastWorkflowStep(taskType: string): boolean {
  const index = WORKFLOW_STEP_ORDER.indexOf(taskType);
  return index === WORKFLOW_STEP_ORDER.length - 1;
}

/**
 * Lấy danh sách các taskType chạy song song với taskType hiện tại
 */
export function getParallelTaskTypes(taskType: string): string[] {
  const step = WORKFLOW_STEPS[taskType as keyof typeof WORKFLOW_STEPS];
  if (!step) return [];
  return [...(step.parallelWith || [])];
}

/**
 * Lấy tất cả taskType trong cùng giai đoạn (bao gồm cả chính nó)
 */
export function getAllTaskTypesInPhase(taskType: string): string[] {
  const parallelTasks = getParallelTaskTypes(taskType);
  return [taskType, ...parallelTasks];
}
