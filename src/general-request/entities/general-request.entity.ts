import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { EntityHelper } from 'src/utils/entity-helper';
import { Employee } from 'src/employee/entities/employee.entity';

@Entity('generalRequest')
export class GeneralRequest extends EntityHelper {
  // Tiêu đề
  @Column({ type: 'varchar', length: 255 })
  title: string;

  // Nội dung yêu cầu
  @Column({ type: 'text' })
  content: string;

  // Nhân viên tạo yêu cầu
  @Column({ type: 'bigint' })
  employeeId: number;

  // Người duyệt đơn
  @Column({ type: 'bigint' })
  approverEmployeeId: number;

  // Trạng thái duyệt
  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
  })
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';

  // Người thực sự duyệt/từ chối đơn
  @Column({ type: 'bigint', nullable: true })
  decidedByEmployeeId?: number | null;

  // Ghi chú quyết định
  @Column({ type: 'varchar', length: 500, nullable: true })
  decisionNote?: string | null;

  // Thời điểm quyết định
  @Column({ type: 'timestamp', nullable: true })
  decidedAt?: Date | null;

  // Relations
  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: 'employeeId' })
  employee?: Employee;

  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: 'approverEmployeeId' })
  approver?: Employee;

  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: 'decidedByEmployeeId' })
  decidedBy?: Employee;
}
