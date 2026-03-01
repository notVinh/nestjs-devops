import { EntityHelper } from 'src/utils/entity-helper';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { Employee } from 'src/employee/entities/employee.entity';
import { BulkOvertimeRequestEmployee } from './bulk-overtime-request-employee.entity';
import { OvertimeCoefficient } from 'src/overtime-coefficient/entities/overtime-coefficient.entity';

@Entity('bulkOvertimeRequest')
export class BulkOvertimeRequest extends EntityHelper {
  @Column({ type: 'int' })
  factoryId: number;

  // Người tạo đơn hàng loạt
  @Column({ type: 'int' })
  creatorEmployeeId: number;

  // Người duyệt đơn tăng ca
  @Column({ type: 'int' })
  approverEmployeeId: number;

  // Tiêu đề đơn hàng loạt
  @Column({ type: 'varchar', length: 500 })
  title: string;

  // Ngày tăng ca
  @Column({ type: 'date' })
  overtimeDate: Date;

  // Giờ bắt đầu tăng ca (HH:mm)
  @Column({ type: 'varchar', length: 5 })
  startTime: string;

  // Giờ kết thúc tăng ca (HH:mm)
  @Column({ type: 'varchar', length: 5 })
  endTime: string;

  // Tổng số giờ tăng ca (tính tự động)
  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  totalHours?: number | null;

  // ID của hệ số tăng ca
  @Column({ type: 'bigint' })
  overtimeCoefficientId: number;

  // Tên ca làm thêm (snapshot từ OvertimeCoefficient)
  @Column({ type: 'varchar', length: 255, nullable: true })
  coefficientName?: string | null;

  // Hệ số tăng ca: 1.5, 2.0, 3.0, etc.
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 1.5 })
  overtimeRate: number;

  // Lý do tăng ca
  @Column({ type: 'varchar', nullable: true })
  reason?: string | null;

  // Trạng thái: draft (nháp), confirmed (đã xác nhận), cancelled (đã hủy)
  @Column({
    type: 'varchar',
    length: 20,
    default: 'draft',
  })
  status: 'draft' | 'confirmed' | 'cancelled';

  // Thời điểm xác nhận
  @Column({ type: 'timestamp', nullable: true })
  confirmedAt?: Date | null;

  // Người xác nhận
  @Column({ type: 'int', nullable: true })
  confirmedByEmployeeId?: number | null;

  // Relations
  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: 'creatorEmployeeId' })
  creator?: Employee;

  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: 'approverEmployeeId' })
  approver?: Employee;

  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: 'confirmedByEmployeeId' })
  confirmedBy?: Employee;

  @ManyToOne(() => OvertimeCoefficient, { eager: false })
  @JoinColumn({ name: 'overtimeCoefficientId' })
  overtimeCoefficient?: OvertimeCoefficient;

  @OneToMany(() => BulkOvertimeRequestEmployee, (item) => item.bulkOvertimeRequest, {
    eager: false,
    cascade: true
  })
  employees?: BulkOvertimeRequestEmployee[];
}
