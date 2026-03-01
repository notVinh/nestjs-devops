import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { EntityHelper } from 'src/utils/entity-helper';
import { Employee } from 'src/employee/entities/employee.entity';
import { MisaSaOrder } from './misa-sa-order.entity';

/**
 * Các loại công việc trong workflow đơn hàng
 */
export const TASK_TYPE = {
  WAREHOUSE_EXPORT: 'warehouse_export',       // Kho xuất máy
  TECHNICAL_CHECK: 'technical_check',         // Kiểm tra kỹ thuật
  DELIVERY: 'delivery',                       // Giao hàng
  INSTALLATION: 'installation',               // Lắp đặt
  CUSTOMER_TRAINING: 'customer_training',     // Hướng dẫn khách hàng
} as const;

export type TaskType = (typeof TASK_TYPE)[keyof typeof TASK_TYPE];

/**
 * Trạng thái của assignment
 */
export const ASSIGNMENT_STATUS = {
  PENDING: 'pending',           // Đã giao, chờ thực hiện
  IN_PROGRESS: 'in_progress',   // Đang thực hiện
  COMPLETED: 'completed',       // Hoàn thành
  INCOMPLETE: 'incomplete',     // Chưa hoàn thành (có lý do) - cần giao lại công việc
  BLOCKED: 'blocked',           // Tạm dừng do sự cố - có thể bắt đầu lại
  REASSIGNED: 'reassigned',     // Đã giao lại cho người khác
  CANCELLED: 'cancelled',       // Đã hủy
} as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUS)[keyof typeof ASSIGNMENT_STATUS];

/**
 * Entity quản lý giao việc cho đơn hàng
 * Mỗi đơn hàng có thể có nhiều assignments (xuất kho, kiểm tra, giao hàng, lắp đặt...)
 */
@Entity('misaSaOrderAssignment')
export class MisaSaOrderAssignment extends EntityHelper {
  @Column({ type: 'int' })
  @Index()
  orderId: number;

  /**
   * Loại công việc: warehouse_export, technical_check, delivery, installation, customer_training
   */
  @Column({ type: 'varchar', length: 50 })
  @Index()
  taskType: string;

  // ===== Người được giao =====

  @Column({ type: 'int' })
  @Index()
  assignedToId: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  assignedToName: string | null;

  // ===== Người giao việc =====

  @Column({ type: 'int' })
  assignedById: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  assignedByName: string | null;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  assignedAt: Date;

  // ===== Thời gian =====

  @Column({ type: 'timestamp with time zone', nullable: true })
  scheduledAt: Date | null; // Thời gian dự kiến thực hiện

  @Column({ type: 'timestamp with time zone', nullable: true })
  startedAt: Date | null; // Thời gian bắt đầu thực hiện

  @Column({ type: 'timestamp with time zone', nullable: true })
  completedAt: Date | null; // Thời gian hoàn thành

  // ===== Trạng thái =====

  @Column({
    type: 'varchar',
    length: 30,
    default: ASSIGNMENT_STATUS.PENDING,
  })
  @Index()
  status: string;

  // ===== Kết quả hoàn thành =====

  @Column({ type: 'text', nullable: true })
  completionNotes: string | null; // Ghi chú khi hoàn thành

  @Column({ type: 'text', nullable: true })
  incompleteReason: string | null; // Lý do chưa hoàn thành

  @Column({ type: 'jsonb', nullable: true })
  attachments: string[] | null; // Danh sách URL ảnh đính kèm

  // ===== Giao lại =====

  @Column({ type: 'int', nullable: true })
  reassignedFromId: number | null; // ID assignment cũ (nếu là giao lại)

  @Column({ type: 'text', nullable: true })
  reassignReason: string | null; // Lý do giao lại

  // ===== Ghi chú =====

  @Column({ type: 'text', nullable: true })
  notes: string | null; // Ghi chú khi giao việc

  // ===== Relations =====

  @ManyToOne(() => MisaSaOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order?: MisaSaOrder;

  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: 'assignedToId' })
  assignedTo?: Employee;

  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: 'assignedById' })
  assignedBy?: Employee;

  @ManyToOne(() => MisaSaOrderAssignment, { eager: false })
  @JoinColumn({ name: 'reassignedFromId' })
  reassignedFrom?: MisaSaOrderAssignment;
}

/**
 * Labels hiển thị cho các loại công việc
 */
export const TASK_TYPE_LABELS: Record<string, string> = {
  [TASK_TYPE.WAREHOUSE_EXPORT]: 'Kho xuất máy',
  [TASK_TYPE.TECHNICAL_CHECK]: 'Kiểm tra kỹ thuật',
  [TASK_TYPE.DELIVERY]: 'Giao hàng',
  [TASK_TYPE.INSTALLATION]: 'Lắp đặt',
  [TASK_TYPE.CUSTOMER_TRAINING]: 'Hướng dẫn khách hàng',
};

/**
 * Labels hiển thị cho trạng thái assignment
 */
export const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  [ASSIGNMENT_STATUS.PENDING]: 'Chờ thực hiện',
  [ASSIGNMENT_STATUS.IN_PROGRESS]: 'Đang thực hiện',
  [ASSIGNMENT_STATUS.COMPLETED]: 'Hoàn thành',
  [ASSIGNMENT_STATUS.INCOMPLETE]: 'Chưa hoàn thành',
  [ASSIGNMENT_STATUS.BLOCKED]: 'Tạm dừng',
  [ASSIGNMENT_STATUS.REASSIGNED]: 'Đã giao lại',
  [ASSIGNMENT_STATUS.CANCELLED]: 'Đã hủy',
};
