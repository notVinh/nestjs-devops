import { Employee } from 'src/employee/entities/employee.entity';
import { Factory } from 'src/factory/entities/factory.entity';
import { EntityHelper } from 'src/utils/entity-helper';
import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';

export enum MaintenanceReportPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum MaintenanceReportStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CANCELLED = 'cancelled',
}

@Entity('maintenanceReport')
export class MaintenanceReport extends EntityHelper {
  @Column({ type: 'bigint' })
  factoryId: number;

  @Column({ type: 'bigint' })
  employeeId: number;

  @Column({ type: 'bigint', nullable: true })
  assignedEmployeeId: number;

  @Column({ type: 'timestamp' })
  reportDate: Date;

  @Column({ type: 'varchar', nullable: true })
  machineCode: string;

  @Column({ type: 'varchar' })
  machineName: string;

  @Column({ type: 'text' })
  issueDescription: string;

  @Column({
    type: 'varchar',
    default: MaintenanceReportPriority.MEDIUM,
  })
  priority: MaintenanceReportPriority;

  @Column({
    type: 'varchar',
    default: MaintenanceReportStatus.PENDING,
  })
  status: MaintenanceReportStatus;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt?: Date;

  @Column({ type: 'text', nullable: true })
  resolvedNote?: string;

  @Column({ type: 'jsonb', nullable: true })
  photoUrls?: string[];

  // Relations
  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @ManyToOne(() => Factory)
  @JoinColumn({ name: 'factoryId' })
  factory: Factory;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'assignedEmployeeId' })
  assignedEmployee?: Employee;
}
