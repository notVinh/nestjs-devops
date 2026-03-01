import { EntityHelper } from 'src/utils/entity-helper';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Employee } from 'src/employee/entities/employee.entity';
import { Factory } from 'src/factory/entities/factory.entity';
import { MisaOrderItem } from './misa-order-item.entity';
import { OrderAssignment } from './order-assignment.entity';

@Entity('misaOrder')
export class MisaOrder extends EntityHelper {
  @Column({ type: 'varchar', length: 50 })
  orderNumber: string;

  @Column({ type: 'date' })
  orderDate: Date;

  @Column({ type: 'varchar', length: 255 })
  customerName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  customerPhone?: string | null;

  @Column({ type: 'text', nullable: true })
  customerAddress?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  customerTaxCode?: string | null;

  // Người tạo đơn (employee_gtg)
  @Column({ type: 'int' })
  createdByEmployeeId: number;

  // Người duyệt (Giám đốc/Phó giám đốc)
  @Column({ type: 'int', nullable: true })
  approvedByEmployeeId?: number | null;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date | null;

  // Người được assign xử lý
  @Column({ type: 'int', nullable: true })
  assignedToEmployeeId?: number | null;

  @Column({ type: 'timestamp', nullable: true })
  assignedAt?: Date | null;

  // Người hoàn thành đơn hàng (khi ở bước installation)
  @Column({ type: 'int', nullable: true })
  completedByEmployeeId?: number | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date | null;

  // Người kiểm tra hàng tồn (phòng kinh doanh)
  @Column({ type: 'int', nullable: true })
  inventoryCheckedByEmployeeId?: number | null;

  @Column({ type: 'timestamp', nullable: true })
  inventoryCheckedAt?: Date | null;

  // Người xác nhận hàng về (khi chuyển từ pending_order về approved)
  @Column({ type: 'int', nullable: true })
  orderReceivedConfirmedByEmployeeId?: number | null;

  @Column({ type: 'timestamp', nullable: true })
  orderReceivedConfirmedAt?: Date | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pendingApproval',
  })
  status: string;

  // Bước hiện tại trong workflow
  @Column({ type: 'varchar', length: 50, nullable: true })
  currentStep?: string | null;

  @Column({ type: 'int' })
  factoryId: number;

  @Column({ type: 'text', nullable: true })
  paymentTerms?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  photoUrls?: string[];

  // Relations
  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: 'createdByEmployeeId' })
  createdBy?: Employee;

  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: 'approvedByEmployeeId' })
  approvedBy?: Employee;

  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: 'assignedToEmployeeId' })
  assignedTo?: Employee;

  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: 'completedByEmployeeId' })
  completedBy?: Employee;

  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: 'inventoryCheckedByEmployeeId' })
  inventoryCheckedBy?: Employee;

  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: 'orderReceivedConfirmedByEmployeeId' })
  orderReceivedConfirmedBy?: Employee;

  @ManyToOne(() => Factory, { eager: false })
  @JoinColumn({ name: 'factoryId' })
  factory?: Factory;

  @OneToMany(() => MisaOrderItem, (item) => item.misaOrder, {
    eager: false,
  })
  items?: MisaOrderItem[];

  @OneToMany(() => OrderAssignment, (assignment) => assignment.order, {
    eager: false,
  })
  assignments?: OrderAssignment[];
}
