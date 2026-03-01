import { Column, Entity, ManyToOne, OneToMany, JoinColumn, Unique } from 'typeorm';
import { EntityHelper } from 'src/utils/entity-helper';
import { Factory } from 'src/factory/entities/factory.entity';
import { Employee } from 'src/employee/entities/employee.entity';
import { SupportRequestItem } from './support-request-item.entity';

@Entity('supportRequest')
export class SupportRequest extends EntityHelper {
  @Column({ type: 'bigint' })
  factoryId: number;

  // Nhân viên tạo đơn
  @Column({ type: 'bigint' })
  employeeId: number;

  // Ngày yêu cầu hỗ trợ
  @Column({ type: 'date' })
  requestDate: Date;

  // Trạng thái duyệt
  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
  })
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';

  // Danh sách người được giao duyệt đơn
  @Column({ type: 'int', array: true, nullable: true })
  approverEmployeeIds?: number[] | null;

  // Người thực sự duyệt/từ chối đơn
  @Column({ type: 'bigint', nullable: true })
  decidedByEmployeeId?: number | null;

  // Ghi chú quyết định
  @Column({ type: 'varchar', length: 500, nullable: true })
  decisionNote?: string | null;

  // Thời điểm quyết định
  @Column({ type: 'timestamp', nullable: true })
  decidedAt?: Date | null;

  // Ghi chú chung của nhân viên
  @Column({ type: 'text', nullable: true })
  note?: string | null;

  // ID đơn yêu cầu hỗ trợ gốc (nếu đây là đơn bổ sung)
  @Column({ type: 'bigint', nullable: true })
  parentSupportRequestId?: number | null;

  // Relations
  @ManyToOne(() => Factory)
  @JoinColumn({ name: 'factoryId' })
  factory: Factory;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'decidedByEmployeeId' })
  decidedBy?: Employee;

  @OneToMany(() => SupportRequestItem, (item) => item.supportRequest, {
    cascade: true,
    eager: true,
  })
  items: SupportRequestItem[];

  // Relation đến đơn gốc (nếu đây là đơn bổ sung)
  @ManyToOne('SupportRequest', { eager: false, nullable: true })
  @JoinColumn({ name: 'parentSupportRequestId' })
  parentSupportRequest?: any | null;
}
