import { EntityHelper } from 'src/utils/entity-helper';
import { Column, Entity, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Department } from '../../deparments/entities/deparment.entity';
import { Employee } from '../../employee/entities/employee.entity';

@Entity('team')
export class Team extends EntityHelper {
  @Column({ type: String })
  name: string;

  @Column({ type: 'bigint' })
  departmentId: number;

  @Column({ type: 'bigint' })
  factoryId: number;

  @Column({ type: String, nullable: true })
  description: string | null;

  @Column({ type: String, default: 'active' })
  status: string;

  // Relations
  @ManyToOne(() => Department, department => department.teams)
  @JoinColumn({ name: 'departmentId' })
  department: Department;

  @OneToMany(() => Employee, employee => employee.team)
  employees: Employee[];
}
