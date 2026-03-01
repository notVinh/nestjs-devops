import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { EntityHelper } from 'src/utils/entity-helper';
import { Employee } from 'src/employee/entities/employee.entity';
import { Factory } from 'src/factory/entities/factory.entity';

export enum FeedbackPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum FeedbackStatus {
  PENDING = 'pending',
  REPLIED = 'replied',
}

@Entity('employeeFeedback')
export class EmployeeFeedback extends EntityHelper {
  @Column({ type: 'bigint' })
  factoryId: number;

  @Column({ type: 'bigint' })
  employeeId: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: FeedbackPriority,
    default: FeedbackPriority.MEDIUM,
  })
  priority: FeedbackPriority;

  @Column({
    type: 'enum',
    enum: FeedbackStatus,
    default: FeedbackStatus.PENDING,
  })
  status: FeedbackStatus;

  @Column({ type: 'simple-array', nullable: true })
  attachments: string[];

  @Column({ type: 'bigint', nullable: true })
  repliedByEmployeeId: number;

  @Column({ type: 'text', nullable: true })
  replyContent: string;

  @Column({ type: 'timestamp', nullable: true })
  repliedAt: Date;

  @Column({ type: 'boolean', default: false })
  isAnonymous: boolean;

  @Column({ type: 'timestamp', nullable: true })
  viewedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  photoUrls?: string[];

    // Relations
  @ManyToOne(() => Factory, { eager: false })
  @JoinColumn({ name: 'factoryId' })
  factory: Factory;

  @ManyToOne(() => Employee, { eager: true })
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @ManyToOne(() => Employee, { eager: true, nullable: true })
  @JoinColumn({ name: 'repliedByEmployeeId' })
  repliedByEmployee: Employee;
}
