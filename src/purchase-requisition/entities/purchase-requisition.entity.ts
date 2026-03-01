import { EntityHelper } from 'src/utils/entity-helper';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Employee } from 'src/employee/entities/employee.entity';
import { Factory } from 'src/factory/entities/factory.entity';
import { MisaOrder } from 'src/misa-order/entities/misa-order.entity';
import { MisaSaOrder } from 'src/misa-token/entities/misa-sa-order.entity';

@Entity('purchaseRequisition')
export class PurchaseRequisition extends EntityHelper {
  @Column({ type: 'varchar', length: 50 })
  requisitionNumber: string;

  // Liên kết với đơn hàng Misa cũ (MisaOrder - nullable cho backward compatibility)
  @Column({ type: 'int', nullable: true })
  misaOrderId: number | null;

  // Liên kết với đơn hàng MisaSaOrder mới (từ MISA sync)
  @Column({ type: 'int', nullable: true })
  misaSaOrderId: number | null;

  @Column({ type: 'int' })
  factoryId: number;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  // Người tạo đề xuất (người hoàn thành inventory check)
  @Column({ type: 'int' })
  createdByEmployeeId: number;

  // Người duyệt đề xuất
  @Column({ type: 'int', nullable: true })
  approvedByEmployeeId?: number | null;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  approvalNotes?: string | null;

  // Status: pending (chờ duyệt), approved (đã duyệt), rejected (từ chối), revision_required (yêu cầu chỉnh sửa), purchase_confirmed (đã xác nhận mua hàng)
  @Column({
    type: 'varchar',
    length: 30,
    default: 'pending',
  })
  status: string;

  // Lý do yêu cầu chỉnh sửa (khi status = revision_required)
  @Column({ type: 'text', nullable: true })
  revisionReason?: string | null;

  // Người yêu cầu chỉnh sửa
  @Column({ type: 'int', nullable: true })
  revisionRequestedByEmployeeId?: number | null;

  @Column({ type: 'timestamp', nullable: true })
  revisionRequestedAt?: Date | null;

  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: 'revisionRequestedByEmployeeId' })
  revisionRequestedBy?: Employee;

  // Người xác nhận đã mua hàng
  @Column({ type: 'int', nullable: true })
  purchaseConfirmedByEmployeeId?: number | null;

  @Column({ type: 'timestamp', nullable: true })
  purchaseConfirmedAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  purchaseConfirmNotes?: string | null;

  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: 'purchaseConfirmedByEmployeeId' })
  purchaseConfirmedBy?: Employee;

  // Relations
  @ManyToOne(() => MisaOrder, { eager: false })
  @JoinColumn({ name: 'misaOrderId' })
  misaOrder?: MisaOrder;

  @ManyToOne(() => MisaSaOrder, { eager: false })
  @JoinColumn({ name: 'misaSaOrderId' })
  misaSaOrder?: MisaSaOrder;

  @ManyToOne(() => Factory, { eager: false })
  @JoinColumn({ name: 'factoryId' })
  factory?: Factory;

  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: 'createdByEmployeeId' })
  createdBy?: Employee;

  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: 'approvedByEmployeeId' })
  approvedBy?: Employee;
}
