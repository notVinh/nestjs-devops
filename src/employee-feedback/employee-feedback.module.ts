import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeFeedbackService } from './employee-feedback.service';
import { EmployeeFeedbackController } from './employee-feedback.controller';
import { EmployeeFeedback } from './entities/employee-feedback.entity';
import { EmployeeModule } from 'src/employee/employee.module';
import { Employee } from 'src/employee/entities/employee.entity';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmployeeFeedback, Employee]),
    EmployeeModule,
    NotificationModule,
  ],
  controllers: [EmployeeFeedbackController],
  providers: [EmployeeFeedbackService],
  exports: [EmployeeFeedbackService],
})
export class EmployeeFeedbackModule {}
