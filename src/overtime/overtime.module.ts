import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Overtime } from './entities/overtime.entity';
import { OvertimeCoefficient } from 'src/overtime-coefficient/entities/overtime-coefficient.entity';
import { Attendance } from 'src/attendance/entities/attendance.entity';
import { Employee } from 'src/employee/entities/employee.entity';
import { OvertimeService } from './overtime.service';
import { OvertimeController } from './overtime.controller';
import { EmployeeModule } from 'src/employee/employee.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Overtime, OvertimeCoefficient, Attendance, Employee]),
    EmployeeModule,
    NotificationModule,
  ],
  controllers: [OvertimeController],
  providers: [OvertimeService],
  exports: [OvertimeService],
})
export class OvertimeModule {}
