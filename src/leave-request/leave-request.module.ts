import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaveRequest } from './entities/leave-request.entity';
import { LeaveRequestService } from './leave-request.service';
import { LeaveRequestController } from './leave-request.controller';
import { Employee } from '../employee/entities/employee.entity';
import { Factory } from '../factory/entities/factory.entity';
import { LeaveType } from '../leave-type/entities/leave-type.entity';
import { EmployeeModule } from 'src/employee/employee.module';
import { NotificationModule } from 'src/notification/notification.module';
import { LeaveTypeModule } from 'src/leave-type/leave-type.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LeaveRequest, Employee, Factory, LeaveType]),
    EmployeeModule,
    NotificationModule,
    LeaveTypeModule,
  ],
  controllers: [LeaveRequestController],
  providers: [LeaveRequestService],
  exports: [LeaveRequestService],
})
export class LeaveRequestModule {}


