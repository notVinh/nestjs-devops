import { Employee } from 'src/employee/entities/employee.entity';
import { Factory } from 'src/factory/entities/factory.entity';
import { EntityHelper } from 'src/utils/entity-helper';
import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';

@Entity('arrivalReport')
export class ArrivalReport extends EntityHelper {
  @Column({ type: 'bigint' })
  factoryId: number;

  @Column({ type: 'bigint' })
  employeeId: number;

  // Người duyệt báo cáo (legacy - giữ lại để tương thích ngược)
  @Column({ type: 'bigint', nullable: true })
  checkEmployeeId: number;

  // Danh sách người được giao duyệt báo cáo
  @Column({ type: 'bigint', array: true, nullable: true })
  checkEmployeeIds?: number[] | null;

  @Column({ type: 'date' })
  arrivalDate: Date;

  @Column({ type: 'timestamp' })
  arrivalTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  departureTime?: Date | null;

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
  arrivalLocation?: { latitude: number; longitude: number } | null;

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
          return { latitude: value.x, longitude: value.y };
        }
        if (typeof value === 'string') {
          const match = value.match(/\(([^,]+),([^)]+)\)/);
          if (match) {
            const latitude = parseFloat(match[1]);
            const longitude = parseFloat(match[2]);
            return { latitude, longitude };
          }
        }
        return value;
      },
    },
  })
  departureLocation?: { latitude: number; longitude: number } | null;

  @Column({ type: 'varchar' })
  companyName: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'arrived',
    enum: ['arrived', 'departed'],
  })
  status: 'arrived' | 'departed';

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'text', nullable: true })
  departureNote?: string;

  @Column({ type: 'jsonb', nullable: true })
  photoUrls?: string[];

  @Column({ type: 'jsonb', nullable: true })
  departurePhotoUrls?: string[];

  @Column({ type: 'int', nullable: true })
  stayDurationMinutes?: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  distanceMeters?: number | null;

  // Relations
  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @ManyToOne(() => Factory)
  @JoinColumn({ name: 'factoryId' })
  factory: Factory;

  @ManyToOne(() => Employee, { nullable: true, eager: false })
  @JoinColumn({ name: 'checkEmployeeId' })
  checker?: Employee;
}
