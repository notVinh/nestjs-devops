import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { EntityHelper } from 'src/utils/entity-helper';
import { Employee } from 'src/employee/entities/employee.entity';
import { MisaSaOrder } from './misa-sa-order.entity';

/**
 * Lưu lịch sử các thao tác trên đơn hàng MISA
 * Mỗi action được ghi lại: ai làm, lúc nào, từ trạng thái gì sang trạng thái gì
 */
@Entity('misaSaOrderWorkflowHistory')
export class MisaSaOrderWorkflowHistory extends EntityHelper {
  @Column({ type: 'int' })
  @Index()
  orderId: number;

  /**
   * Loại action:
   * - submit_for_approval: Sale Admin gửi duyệt
   * - approve: BGĐ duyệt
   * - reject: BGĐ từ chối
   * - pause: Tạm dừng
   * - resume: Tiếp tục
   * - cancel: Hủy đơn
   * - update_additional_order: Cập nhật thông tin đặt thêm hàng
   * - assign_task: Giao việc
   * - complete_task: Hoàn thành công việc
   * - ... (có thể mở rộng thêm)
   */
  @Column({ type: 'varchar', length: 50 })
  @Index()
  action: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  fromStatus: string | null; // Trạng thái trước khi thực hiện action

  @Column({ type: 'varchar', length: 50, nullable: true })
  toStatus: string | null; // Trạng thái sau khi thực hiện action

  @Column({ type: 'int' })
  @Index()
  performedByEmployeeId: number; // ID nhân viên thực hiện

  @Column({ type: 'varchar', length: 255, nullable: true })
  performedByName: string | null; // Tên nhân viên (cache để hiển thị nhanh)

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  performedAt: Date; // Thời điểm thực hiện

  @Column({ type: 'text', nullable: true })
  notes: string | null; // Ghi chú (lý do từ chối, ghi chú duyệt, ...)

  /**
   * Metadata lưu thông tin bổ sung tùy theo action:
   * - approve/reject: { approved: boolean }
   * - update_additional_order: { needsAdditionalOrder: boolean, additionalOrderNote: string }
   * - assign_task: { taskType: string, assignedToEmployeeId: number }
   * - ...
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  // ===== Relations =====

  @ManyToOne(() => MisaSaOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order?: MisaSaOrder;

  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: 'performedByEmployeeId' })
  performedBy?: Employee;
}

/**
 * Các loại action trong workflow
 */
export const WORKFLOW_ACTION = {
  // Luồng duyệt đơn
  SUBMIT_FOR_APPROVAL: 'submit_for_approval',
  RESUBMIT_FOR_APPROVAL: 'resubmit_for_approval', // Gửi lại sau khi bị từ chối
  APPROVE: 'approve',
  REJECT: 'reject',

  // Quản lý đơn
  PAUSE: 'pause',
  RESUME: 'resume',
  CANCEL: 'cancel',

  // Cập nhật thông tin
  UPDATE_ADDITIONAL_ORDER: 'update_additional_order',
  UPDATE_LOCAL_FIELDS: 'update_local_fields',

  // Giao việc & hoàn thành
  ASSIGN_TASK: 'assign_task',
  COMPLETE_TASK: 'complete_task',
  REASSIGN_TASK: 'reassign_task',
  RETRY_TASK: 'retry_task', // Giao tiếp việc (sau khi incomplete)
  BLOCK_TASK: 'block_task', // Báo sự cố tạm dừng
  RESUME_TASK: 'resume_task', // Bắt đầu lại sau khi tạm dừng

  // Giao hàng
  START_DELIVERY: 'start_delivery',
  COMPLETE_DELIVERY: 'complete_delivery',

  // Lắp đặt
  START_INSTALLATION: 'start_installation',
  COMPLETE_INSTALLATION: 'complete_installation',

  // Hoàn tất đơn hàng
  COMPLETE_ORDER: 'complete_order',
} as const;

export type WorkflowAction = (typeof WORKFLOW_ACTION)[keyof typeof WORKFLOW_ACTION];
