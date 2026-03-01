import { EntityHelper } from "src/utils/entity-helper";
import { Column, Entity, OneToMany } from "typeorm";
import { PositionEmployee } from "../../position-employee/entities/position-employee.entity";
import { Team } from "../../team/entities/team.entity";

@Entity('department')
export class Department extends EntityHelper {
    @Column()
    name: string;

    @Column({ type: 'bigint' })
    factoryId: number;

    @Column({ type: String, nullable: true })
    description: string;

    @Column({ type: String, default: 'active' })
    status: string;

    // Relations
    @OneToMany(() => PositionEmployee, position => position.department)
    positions: PositionEmployee[];

    @OneToMany(() => Team, team => team.department)
    teams: Team[];
}