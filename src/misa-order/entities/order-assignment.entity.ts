import { EntityHelper } from 'src/utils/entity-helper';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Employee } from 'src/employee/entities/employee.entity';
import { MisaOrder } from './misa-order.entity';

@Entity('orderAssignment')
export class OrderAssignment extends EntityHelper {
  @Column({ type: 'int' })
  orderId: number;

  @Column({ type: 'int' })
  employeeId: number;

  @Column({ type: 'varchar', length: 50 })
  step: string; // warehouse, quality_check, delivery, gate_control, self_delivery, installation, shipping_company

  @Column({ type: 'int', default: 1 })
  revision: number; // Số lần thực hiện step này (1, 2, 3,... khi phải làm lại)

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  assignedAt: Date;

  @Column({ type: 'int', nullable: true })
  assignedByEmployeeId?: number | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  // Shipping company info (only for step = shipping_company)
  @Column({ type: 'varchar', length: 255, nullable: true })
  shippingCompanyName?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  shippingCompanyPhone?: string | null;

  @Column({ type: 'text', nullable: true })
  shippingCompanyAddress?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  trackingNumber?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  photoUrls?: string[];

  // Relations
  @ManyToOne(() => MisaOrder, (order) => order.assignments)
  @JoinColumn({ name: 'orderId' })
  order?: MisaOrder;

  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: 'employeeId' })
  employee?: Employee;

  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: 'assignedByEmployeeId' })
  assignedBy?: Employee;
}
