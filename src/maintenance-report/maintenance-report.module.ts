import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenanceReportService } from './maintenance-report.service';
import { MaintenanceReportController } from './maintenance-report.controller';
import { MaintenanceReport } from './entities/maintenance-report.entity';
import { Employee } from 'src/employee/entities/employee.entity';
import { EmployeeModule } from 'src/employee/employee.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MaintenanceReport, Employee]),
    EmployeeModule,
    NotificationModule,
  ],
  controllers: [MaintenanceReportController],
  providers: [MaintenanceReportService],
  exports: [MaintenanceReportService],
})
export class MaintenanceReportModule {}
