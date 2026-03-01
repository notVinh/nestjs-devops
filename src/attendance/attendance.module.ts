import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceReminderService } from './attendance-reminder.service';
import { Attendance } from './entities/attendance.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeModule } from 'src/employee/employee.module';
import { OvertimeModule } from 'src/overtime/overtime.module';
import { NotificationModule } from 'src/notification/notification.module';
import { User } from 'src/users/entities/user.entity';
import { Factory } from 'src/factory/entities/factory.entity';
import { Employee } from 'src/employee/entities/employee.entity';
import { Holiday } from 'src/holiday/entities/holiday.entity';
import { SupportType } from 'src/support-type/entities/support-type.entity';
import { SupportRequest } from 'src/support-request/entities/support-request.entity';
import { Overtime } from 'src/overtime/entities/overtime.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attendance, User, Factory, Employee, Holiday, SupportType, SupportRequest, Overtime]),
    EmployeeModule,
    OvertimeModule,
    NotificationModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceReminderService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
