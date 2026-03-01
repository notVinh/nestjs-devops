import { Module } from '@nestjs/common';
import { DeparmentsService } from './deparments.service';
import { DeparmentsController } from './deparments.controller';
import { Department } from './entities/deparment.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PositionEmployee } from 'src/position-employee/entities/position-employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Department, PositionEmployee])],
  providers: [DeparmentsService],
  controllers: [DeparmentsController]
})
export class DeparmentsModule {}
