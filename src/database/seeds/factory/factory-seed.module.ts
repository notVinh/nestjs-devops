import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FactorySeedService } from './factory-seed.service';
import { Factory } from 'src/factory/entities/factory.entity';
import { Department } from 'src/deparments/entities/deparment.entity';
import { PositionEmployee } from 'src/position-employee/entities/position-employee.entity';
import { Employee } from 'src/employee/entities/employee.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Factory, Department, PositionEmployee, Employee]),
  ],
  providers: [FactorySeedService],
  exports: [FactorySeedService],
})
export class FactorySeedModule {}
