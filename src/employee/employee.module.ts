import { Module } from '@nestjs/common';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from './entities/employee.entity';
import { PositionEmployee } from '../position-employee/entities/position-employee.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../deparments/entities/deparment.entity';
import { Factory } from '../factory/entities/factory.entity';
import { Team } from '../team/entities/team.entity';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      PositionEmployee,
      User,
      Department,
      Factory,
      Team,
    ]),
    SessionModule,
  ],
  controllers: [EmployeeController],
  providers: [EmployeeService],
  exports: [EmployeeService],
})
export class EmployeeModule {}
