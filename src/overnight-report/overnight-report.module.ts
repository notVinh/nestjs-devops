import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OvernightReport } from './entities/overnight-report.entity';
import { Employee } from 'src/employee/entities/employee.entity';
import { Factory } from 'src/factory/entities/factory.entity';
import { OvernightReportController } from './overnight-report.controller';
import { OvernightReportService } from './overnight-report.service';
import { EmployeeModule } from 'src/employee/employee.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OvernightReport, Employee, Factory]),
    EmployeeModule,
    NotificationModule,
  ],
  controllers: [OvernightReportController],
  providers: [OvernightReportService],
  exports: [OvernightReportService],
})
export class OvernightReportModule {}
