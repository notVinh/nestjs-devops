import { Employee } from 'src/employee/entities/employee.entity';
import { Factory } from 'src/factory/entities/factory.entity';
import { EntityHelper } from 'src/utils/entity-helper';
import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';

@Entity('overnightReport')
export class OvernightReport extends EntityHelper {
  @Column({ type: 'bigint' })
  factoryId: number;

  @Column({ type: 'bigint' })
  employeeId: number;

  @Column({ type: 'date' })
  reportDate: Date;

  @Column({ type: 'timestamp' })
  reportTime: Date;

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
  location?: { latitude: number; longitude: number } | null;

  @Column({ type: 'varchar', nullable: true })
  address?: string;

  @Column({ type: 'varchar', default: 'reported' })
  status: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'jsonb', nullable: true })
  photoUrls?: string[];

  // Danh sách ID nhân viên nhận báo cáo (nhiều người)
  @Column({ type: 'jsonb', nullable: true })
  receiverEmployeeIds?: number[];

  // Relations
  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @ManyToOne(() => Factory)
  @JoinColumn({ name: 'factoryId' })
  factory: Factory;
}
