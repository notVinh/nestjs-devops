import { EntityHelper } from 'src/utils/entity-helper';
import { Column, Entity, ManyToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { Factory } from '../../factory/entities/factory.entity';
import { Employee } from '../../employee/entities/employee.entity';

@Entity('roleGroup')
export class RoleGroup extends EntityHelper {
  @Column({ type: String })
  name: string;

  @Column({ type: String, nullable: true })
  description: string | null;

  @Column({ type: 'bigint' })
  factoryId: number;

  @Column({ type: 'boolean', default: false })
  canAccessAdmin: boolean;

  @Column({ type: 'text', array: true, nullable: true, default: '{}' })
  adminMenuKeys: string[] | null;

  @Column({ type: 'text', array: true, nullable: true, default: '{}' })
  permissions: string[] | null;

  @Column({ type: String, default: 'active' })
  status: string;

  // Relations
  @ManyToOne(() => Factory)
  @JoinColumn({ name: 'factoryId' })
  factory: Factory;

  @ManyToMany(() => Employee, employee => employee.roleGroups)
  @JoinTable({
    name: 'employeeRoleGroup',
    joinColumn: { name: 'roleGroupId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'employeeId', referencedColumnName: 'id' }
  })
  employees: Employee[];
}

