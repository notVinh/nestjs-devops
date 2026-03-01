import { Module } from '@nestjs/common';
import { FactoryController } from './factory.controller';
import { FactoryService } from './factory.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Factory } from './entities/factory.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Employee } from '../employee/entities/employee.entity';
import { User } from '../users/entities/user.entity';
import { PositionEmployee } from '../position-employee/entities/position-employee.entity';
import { Department } from 'src/deparments/entities/deparment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Factory,
      Attendance,
      Employee,
      User,
      PositionEmployee,
      Department,
    ]),
  ],
  controllers: [FactoryController],
  providers: [FactoryService],
})
export class FactoryModule {}
