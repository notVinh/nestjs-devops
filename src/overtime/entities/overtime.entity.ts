import { EntityHelper } from 'src/utils/entity-helper';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Employee } from 'src/employee/entities/employee.entity';

@Entity('overtime')
export class Overtime extends EntityHelper {
  @Column({ type: 'int' })
  factoryId: number;

  // Nhân viên đăng ký tăng ca
  @Column({ type: 'int' })
  employeeId: number;

  // Người duyệt đơn tăng ca (legacy - giữ lại để tương thích ngược)
  @Column({ type: 'int' })
  approverEmployeeId: number;

  // Danh sách người được giao duyệt đơn
  @Column({ type: 'int', array: true, nullable: true })
  approverEmployeeIds?: number[] | null;

  // Người thực sự duyệt/từ chối đơn
  @Column({ type: 'int', nullable: true })
  decidedByEmployeeId?: number | null;

  // Tên ca làm thêm (snapshot từ OvertimeCoefficient)
  @Column({ type: 'varchar', length: 255, nullable: true })
  coefficientName?: string | null;

  // Ngày tăng ca
  @Column({ type: 'date' })
  overtimeDate: Date;

  // Giờ bắt đầu tăng ca (HH:mm) - Legacy, giữ lại để backward compatibility
  @Column({ type: 'varchar', length: 5 })
  startTime: string;

  // Giờ kết thúc tăng ca (HH:mm) - Legacy, giữ lại để backward compatibility
  @Column({ type: 'varchar', length: 5 })
  endTime: string;

  // Danh sách các khung giờ tăng ca (hỗ trợ nhiều ca trong 1 ngày)
  // Format: [{ startTime: "05:00", endTime: "07:00" }, { startTime: "18:00", endTime: "20:00" }]
  @Column({ type: 'jsonb', nullable: true })
  timeSlots?: Array<{ startTime: string; endTime: string }> | null;

  // Tổng số giờ tăng ca (tính tự động hoặc nhập)
  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  totalHours?: number | null;

  // Hệ số tăng ca: 1.5 (ngày thường), 2.0 (cuối tuần), 3.0 (lễ/tết)
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 1.5 })
  overtimeRate: number;

  // Lý do tăng ca
  @Column({ type: 'varchar', nullable: true })
  reason?: string | null;

  // Trạng thái duyệt
  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
  })
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';

  // Ghi chú quyết định
  @Column({ type: 'varchar', nullable: true })
  decisionNote?: string | null;

  // Thời điểm quyết định
  @Column({ type: 'timestamp', nullable: true })
  decidedAt?: Date | null;

  // Vị trí yêu cầu tăng ca
  @Column({
    type: 'point',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
    transformer: {
      to: (value?: { latitude: number; longitude: number } | string | null) => {
        if (!value) return null;
        if (typeof value === 'string') return value;
        const { longitude, latitude } = value as {
          latitude: number;
          longitude: number;
        };
        return `(${latitude},${longitude})`;
      },
      from: (value: any) => {
        if (!value) return null;
        if (
          typeof value === 'object' &&
          value.x !== undefined &&
          value.y !== undefined
        ) {
          // Vì to() lưu (latitude, longitude) nên x=latitude, y=longitude
          return { latitude: value.x, longitude: value.y };
        }
        if (typeof value === 'string') {
          const match = value.match(/\(([^,]+),([^)]+)\)/);
          if (match) {
            // String format: (latitude, longitude) - giống với to()
            const latitude = parseFloat(match[1]);
            const longitude = parseFloat(match[2]);
            return { latitude, longitude };
          }
        }
        return value;
      },
    },
  })
  requestLocation?: { latitude: number; longitude: number } | null;

  // Tracking: Số giờ chênh lệch so với đăng ký (dương = vượt, âm = thiếu)
  // Tính từ attendance.checkOutTime so với overtime.endTime
  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  excessHours?: number | null;

  // Tracking: Trạng thái thực hiện tăng ca so với kế hoạch
  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    enum: [
      'not_started',
      'in_progress',
      'completed',
      'completed_early',
      'exceeded',
    ],
  })
  actualStatus?:
    | 'not_started'
    | 'in_progress'
    | 'completed'
    | 'completed_early'
    | 'exceeded'
    | null;

  // ID đơn tăng ca gốc (nếu đây là đơn bổ sung)
  @Column({ type: 'int', nullable: true })
  parentOvertimeId?: number | null;

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

  // Relation đến đơn tăng ca gốc (nếu đây là đơn bổ sung)
  // Sử dụng lazy relation để tránh circular dependency
  @ManyToOne('Overtime', { eager: false, nullable: true })
  @JoinColumn({ name: 'parentOvertimeId' })
  parentOvertime?: any | null;

  // Danh sách các đơn bổ sung (nếu đây là đơn gốc)
  // Note: Không cần relation inverse vì có thể query bằng parentOvertimeId
}
