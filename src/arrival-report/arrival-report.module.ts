import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArrivalReport } from './entities/arrival-report.entity';
import { Employee } from 'src/employee/entities/employee.entity';
import { ArrivalReportController } from './arrival-report.controller';
import { ArrivalReportService } from './arrival-report.service';
import { EmployeeModule } from 'src/employee/employee.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ArrivalReport, Employee]),
    EmployeeModule,
    NotificationModule,
  ],
  controllers: [ArrivalReportController],
  providers: [ArrivalReportService],
  exports: [ArrivalReportService],
})
export class ArrivalReportModule {}
