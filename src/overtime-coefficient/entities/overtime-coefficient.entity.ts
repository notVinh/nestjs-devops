import { EntityHelper } from 'src/utils/entity-helper';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Factory } from 'src/factory/entities/factory.entity';

export enum ShiftType {
  DAY = 'DAY',
  NIGHT = 'NIGHT',
}

export enum DayType {
  WEEKDAY = 'WEEKDAY',
  WEEKEND = 'WEEKEND',
  HOLIDAY = 'HOLIDAY',
}

@Entity('overtimeCoefficient')
export class OvertimeCoefficient extends EntityHelper {
  @Column({ type: 'int' })
  factoryId: number;

  @Column({ type: 'varchar', length: 255 })
  shiftName: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  coefficient: number;

  @Column({
    type: 'varchar',
    length: 20,
    enum: ShiftType,
  })
  shiftType: ShiftType;

  @Column({
    type: 'varchar',
    length: 20,
    enum: DayType,
  })
  dayType: DayType;

  @Column({ type: 'boolean', default: false })
  hasWorkedDayShift: boolean;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => Factory, { eager: false })
  @JoinColumn({ name: 'factoryId' })
  factory?: Factory;
}
