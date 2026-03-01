import { EntityHelper } from 'src/utils/entity-helper';
import { Column, Entity, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Department } from '../../deparments/entities/deparment.entity';
import { Employee } from '../../employee/entities/employee.entity';

@Entity('positionEmployee')
export class PositionEmployee extends EntityHelper {
  @Column({ type: String })
  name: string;

  @Column({ type: String })
  description: string;

  @Column({ type: 'bigint' })
  factoryId: number;

  @Column({ type: 'bigint' })
  departmentId: number;

  @Column({ type: String, default: 'active' })
  status: string;

  // Relations
  @ManyToOne(() => Department, department => department.positions)
  @JoinColumn({ name: 'departmentId' })
  department: Department;

  @OneToMany(() => Employee, employee => employee.position)
  employees: Employee[];
}
