import { EntityHelper } from 'src/utils/entity-helper';
import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { Employee } from '../../employee/entities/employee.entity';

@Entity()
export class Attendance extends EntityHelper {
  @Column({ type: 'int' })
  factoryId: number;

  @Column({ type: 'int' })
  employeeId: number;

  @Column({ type: 'date' })
  attendanceDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  checkInTime?: Date;

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
  checkInLocation?: { latitude: number; longitude: number } | null;

  @Column({ type: 'varchar', nullable: true })
  checkInAddress?: string;

  @Column({ type: 'varchar', nullable: true })
  checkInPhotoUrl?: string;

  @Column({ type: 'jsonb', nullable: true })
  checkInDeviceInfo?: any;

  @Column({ type: 'varchar', length: 20, nullable: true })
  checkInMethod?: string;

  @Column({ type: 'timestamp', nullable: true })
  checkOutTime?: Date;

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
  checkOutLocation?: { latitude: number; longitude: number } | null;

  @Column({ type: 'varchar', nullable: true })
  checkOutAddress?: string;

  @Column({ type: 'varchar', nullable: true })
  checkOutPhotoUrl?: string;

  @Column({ type: 'jsonb', nullable: true })
  checkOutDeviceInfo?: any;

  @Column({ type: 'varchar', length: 20, nullable: true })
  checkOutMethod?: string;

  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  workHours?: number;

  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  overtimeHours?: number;

  @Column({ type: 'text', nullable: true })
  overtimeNote?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  photoUrls?: string[];

  @Column({
    type: 'varchar',
    length: 20,
    default: 'present',
    enum: [
      'present',
      'late',
      'earlyLeave',
      'absent',
      'onLeave',
      'businessTrip',
      'remote',
      'overtime_approved', // Đã duyệt tăng ca nhưng chưa chấm công thực tế
    ],
  })
  status: string;

  @Column({ type: 'boolean', default: false })
  isLate: boolean;

  @Column({ type: 'int', default: 0 })
  lateMinutes: number;

  @Column({ type: 'boolean', default: false })
  isEarlyLeave: boolean;

  @Column({ type: 'int', default: 0 })
  earlyLeaveMinutes: number;

  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: 'employeeId' })
  employee?: Employee;
}
