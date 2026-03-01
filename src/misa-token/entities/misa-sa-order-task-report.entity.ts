import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { EntityHelper } from 'src/utils/entity-helper';
import { Employee } from 'src/employee/entities/employee.entity';
import { MisaSaOrder } from './misa-sa-order.entity';
import { MisaSaOrderAssignment } from './misa-sa-order-assignment.entity';

/**
 * Loại báo cáo
 */
export const REPORT_TYPE = {
  DAILY_PROGRESS: 'daily_progress',   // Báo cáo tiến độ hàng ngày
  COMPLETION: 'completion',           // Báo cáo hoàn thành
  ISSUE: 'issue',                     // Báo cáo vấn đề/sự cố
  RETRY: 'retry',                     // Giao tiếp việc (sau khi incomplete)
} as const;

export type ReportType = (typeof REPORT_TYPE)[keyof typeof REPORT_TYPE];

/**
 * Trạng thái trong báo cáo
 */
export const REPORT_STATUS = {
  IN_PROGRESS: 'in_progress',   // Đang thực hiện
  COMPLETED: 'completed',       // Hoàn thành
  INCOMPLETE: 'incomplete',     // Chưa hoàn thành
  BLOCKED: 'blocked',           // Bị chặn/không thể tiếp tục
} as const;

export type ReportStatus = (typeof REPORT_STATUS)[keyof typeof REPORT_STATUS];

/**
 * Entity lưu báo cáo tiến độ/hoàn thành công việc
 * Mỗi assignment có thể có nhiều reports (báo cáo hàng ngày, báo cáo hoàn thành)
 */
@Entity('misaSaOrderTaskReport')
export class MisaSaOrderTaskReport extends EntityHelper {
  @Column({ type: 'int' })
  @Index()
  assignmentId: number;

  @Column({ type: 'int' })
  @Index()
  orderId: number; // Để query nhanh theo đơn hàng

  // ===== Người báo cáo =====

  @Column({ type: 'int' })
  @Index()
  reportedById: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reportedByName: string | null;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  reportedAt: Date;

  @Column({ type: 'date' })
  @Index()
  reportDate: Date; // Ngày báo cáo (để check báo cáo hàng ngày, unique per assignment per day)

  // ===== Nội dung báo cáo =====

  /**
   * Loại báo cáo: daily_progress, completion, issue
   */
  @Column({ type: 'varchar', length: 30 })
  @Index()
  reportType: string;

  /**
   * Trạng thái công việc: in_progress, completed, incomplete, blocked
   */
  @Column({ type: 'varchar', length: 30 })
  status: string;

  @Column({ type: 'int', nullable: true })
  progressPercent: number | null; // % hoàn thành (0-100)

  @Column({ type: 'text' })
  description: string; // Mô tả tiến độ/vấn đề

  // ===== Đính kèm =====

  @Column({ type: 'jsonb', nullable: true })
  attachments: string[] | null; // Danh sách URL ảnh

  // ===== Nếu incomplete/blocked =====

  @Column({ type: 'text', nullable: true })
  blockedReason: string | null; // Lý do bị chặn/chưa hoàn thành

  // ===== Relations =====

  @ManyToOne(() => MisaSaOrderAssignment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignmentId' })
  assignment?: MisaSaOrderAssignment;

  @ManyToOne(() => MisaSaOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order?: MisaSaOrder;

  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: 'reportedById' })
  reportedBy?: Employee;
}

/**
 * Labels hiển thị cho loại báo cáo
 */
export const REPORT_TYPE_LABELS: Record<string, string> = {
  [REPORT_TYPE.DAILY_PROGRESS]: 'Báo cáo tiến độ',
  [REPORT_TYPE.COMPLETION]: 'Báo cáo hoàn thành',
  [REPORT_TYPE.ISSUE]: 'Báo cáo sự cố',
  [REPORT_TYPE.RETRY]: 'Giao tiếp việc',
};

/**
 * Labels hiển thị cho trạng thái báo cáo
 */
export const REPORT_STATUS_LABELS: Record<string, string> = {
  [REPORT_STATUS.IN_PROGRESS]: 'Đang thực hiện',
  [REPORT_STATUS.COMPLETED]: 'Hoàn thành',
  [REPORT_STATUS.INCOMPLETE]: 'Chưa hoàn thành',
  [REPORT_STATUS.BLOCKED]: 'Bị chặn',
};
