import { EntityHelper } from 'src/utils/entity-helper';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Employee } from 'src/employee/entities/employee.entity';
import { LeaveType } from 'src/leave-type/entities/leave-type.entity';

@Entity("leaveRequest")
export class LeaveRequest extends EntityHelper {
  @Column({ type: 'int' })
  factoryId: number;

  // Người tạo đơn nghỉ (nhân viên)
  @Column({ type: 'int' })
  employeeId: number;

  // Người duyệt đơn (legacy - giữ lại để tương thích ngược)
  @Column({ type: 'int' })
  approverEmployeeId: number;

  // Danh sách người được giao duyệt đơn
  @Column({ type: 'int', array: true, nullable: true })
  approverEmployeeIds?: number[] | null;

  // Người thực sự duyệt/từ chối đơn
  @Column({ type: 'int', nullable: true })
  decidedByEmployeeId?: number | null;

  // Loại nghỉ: có lương / không lương (legacy, giữ lại để tương thích ngược)
  @Column({
    type: 'varchar',
    length: 20,
    default: 'paid',
    enum: ['paid', 'unpaid'],
  })
  leaveType: 'paid' | 'unpaid';

  // Reference đến bảng LeaveType mới
  @Column({ type: 'bigint', nullable: true })
  leaveTypeId?: number | null;

  // Buổi nghỉ: cả ngày / buổi sáng / buổi chiều
  @Column({
    type: 'varchar',
    length: 20,
    default: 'full_day',
    enum: ['full_day', 'morning', 'afternoon'],
  })
  leaveSession: 'full_day' | 'morning' | 'afternoon';

  // Thời gian nghỉ
  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  // Số ngày nghỉ (tính trước / hoặc để null nếu muốn tính động)
  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  totalDays?: number | null;

  // Lý do nghỉ
  @Column({ type: 'varchar', nullable: true })
  reason?: string | null;

  // Trạng thái duyệt
  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
    enum: ['pending', 'approved', 'rejected', 'cancelled', 'hr_confirmed'],
  })
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'hr_confirmed';

  // Ghi chú quyết định (khi duyệt/từ chối)
  @Column({ type: 'varchar', nullable: true })
  decisionNote?: string | null;

  // Thời điểm quyết định
  @Column({ type: 'timestamp', nullable: true })
  decidedAt?: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  photoUrls?: string[];

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

  @ManyToOne(() => LeaveType, { eager: false })
  @JoinColumn({ name: 'leaveTypeId' })
  leaveTypeRef?: LeaveType;
}


