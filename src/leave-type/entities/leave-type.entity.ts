import { EntityHelper } from 'src/utils/entity-helper';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Factory } from 'src/factory/entities/factory.entity';

@Entity('leaveType')
export class LeaveType extends EntityHelper {
  @Column({ type: 'int' })
  factoryId: number;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  // Có hưởng lương hay không
  @Column({ type: 'boolean', default: true })
  isPaid: boolean;

  // Có trừ phép năm hay không
  @Column({ type: 'boolean', default: true })
  deductsFromAnnualLeave: boolean;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Thứ tự hiển thị
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @ManyToOne(() => Factory, { eager: false })
  @JoinColumn({ name: 'factoryId' })
  factory?: Factory;
}
