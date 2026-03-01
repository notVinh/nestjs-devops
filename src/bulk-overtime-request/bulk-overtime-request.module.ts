import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BulkOvertimeRequest } from './entities/bulk-overtime-request.entity';
import { BulkOvertimeRequestEmployee } from './entities/bulk-overtime-request-employee.entity';
import { OvertimeCoefficient } from 'src/overtime-coefficient/entities/overtime-coefficient.entity';
import { Overtime } from 'src/overtime/entities/overtime.entity';
import { Attendance } from 'src/attendance/entities/attendance.entity';
import { Employee } from 'src/employee/entities/employee.entity';
import { BulkOvertimeRequestService } from './bulk-overtime-request.service';
import { BulkOvertimeRequestController } from './bulk-overtime-request.controller';
import { EmployeeModule } from 'src/employee/employee.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BulkOvertimeRequest,
      BulkOvertimeRequestEmployee,
      OvertimeCoefficient,
      Overtime,
      Attendance,
      Employee,
    ]),
    EmployeeModule,
    NotificationModule,
  ],
  controllers: [BulkOvertimeRequestController],
  providers: [BulkOvertimeRequestService],
  exports: [BulkOvertimeRequestService],
})
export class BulkOvertimeRequestModule {}
