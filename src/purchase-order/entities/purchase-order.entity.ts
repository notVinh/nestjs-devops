import { EntityHelper } from 'src/utils/entity-helper';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Employee } from 'src/employee/entities/employee.entity';
import { Factory } from 'src/factory/entities/factory.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';

@Entity('purchaseOrder')
export class PurchaseOrder extends EntityHelper {
  @Column({ type: 'varchar', length: 50 })
  orderNumber: string;

  @Column({ type: 'date' })
  orderDate: Date;

  // Thông tin nhà cung cấp (Supplier)
  @Column({ type: 'varchar', length: 255 })
  supplierName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  supplierPhone?: string | null;

  @Column({ type: 'text', nullable: true })
  supplierAddress?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  supplierTaxCode?: string | null;

  // Người tạo đơn (employee_gtg)
  @Column({ type: 'int' })
  createdByEmployeeId: number;

  // Người nhập ngày dự kiến hàng về
  @Column({ type: 'int', nullable: true })
  confirmedByEmployeeId?: number | null;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt?: Date | null;

  // Thời gian hàng về dự kiến
  @Column({ type: 'date', nullable: true })
  expectedDeliveryDate?: Date | null;

  // Số ngày còn lại đến khi hàng về (tính từ expectedDeliveryDate)
  @Column({ type: 'int', nullable: true })
  daysUntilDelivery?: number | null;

  // Người nhận hàng (xác nhận hàng về)
  @Column({ type: 'int', nullable: true })
  receivedByEmployeeId?: number | null;

  @Column({ type: 'timestamp', nullable: true })
  receivedAt?: Date | null;

  // Người hoàn thành đơn hàng (thanh toán, kiểm tra chất lượng)
  @Column({ type: 'int', nullable: true })
  completedByEmployeeId?: number | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date | null;

  // Status: pending (chờ nhập ngày), waiting (chờ hàng về), received (đã nhận), completed (hoàn thành), cancelled (đã hủy)
  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status: string;

  @Column({ type: 'int' })
  factoryId: number;

  // Ngày giao hàng dự kiến (từ nhà cung cấp)
  @Column({ type: 'date', nullable: true })
  deliveryDate?: Date | null;

  // Địa điểm giao hàng
  @Column({ type: 'text', nullable: true })
  deliveryLocation?: string | null;

  // Điều khoản thanh toán
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
  @JoinColumn({ name: 'confirmedByEmployeeId' })
  confirmedBy?: Employee;

  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: 'receivedByEmployeeId' })
  receivedBy?: Employee;

  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: 'completedByEmployeeId' })
  completedBy?: Employee;

  @ManyToOne(() => Factory, { eager: false })
  @JoinColumn({ name: 'factoryId' })
  factory?: Factory;

  @OneToMany(() => PurchaseOrderItem, (item) => item.purchaseOrder, {
    eager: false,
  })
  items?: PurchaseOrderItem[];
}
