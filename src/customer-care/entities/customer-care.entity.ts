import { Employee } from 'src/employee/entities/employee.entity';
import { MisaCustomer } from 'src/misa-token/entities/misa-customer.entity';
import { EntityHelper } from 'src/utils/entity-helper';
import { Column, Entity, ManyToOne, JoinColumn, Index } from 'typeorm';

@Entity('customerCare')
export class CustomerCare extends EntityHelper {
  @Column({ type: 'bigint' })
  @Index()
  customerId: number;

  @Column({ type: 'bigint' })
  @Index()
  employeeId: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'timestamp' })
  checkInTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  checkOutTime?: Date | null;

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
  checkInLocation?: { latitude: number; longitude: number } | null;

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
  checkOutLocation?: { latitude: number; longitude: number } | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'checking_in',
    enum: ['checking_in', 'completed'],
  })
  status: 'checking_in' | 'completed';

  @Column({ type: 'text', nullable: true })
  checkInNote?: string;

  @Column({ type: 'text', nullable: true })
  checkOutNote?: string;

  @Column({ type: 'jsonb', nullable: true })
  checkInPhotoUrls?: string[];

  @Column({ type: 'jsonb', nullable: true })
  checkOutPhotoUrls?: string[];

  @Column({ type: 'int', nullable: true })
  stayDurationMinutes?: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  distanceMeters?: number | null;

  // Relations
  @ManyToOne(() => MisaCustomer)
  @JoinColumn({ name: 'customerId' })
  customer: MisaCustomer;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;
}
