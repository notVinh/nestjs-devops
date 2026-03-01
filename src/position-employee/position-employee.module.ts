import { Module } from '@nestjs/common';
import { PositionEmployeeService } from './position-employee.service';
import { PositionEmployeeController } from './position-employee.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PositionEmployee } from './entities/position-employee.entity';
import { Department } from '../deparments/entities/deparment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PositionEmployee, Department])],
  providers: [PositionEmployeeService],
  controllers: [PositionEmployeeController]
})
export class PositionEmployeeModule {}
