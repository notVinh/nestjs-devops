import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeneralRequest } from './entities/general-request.entity';
import { GeneralRequestService } from './general-request.service';
import { GeneralRequestController } from './general-request.controller';
import { EmployeeModule } from 'src/employee/employee.module';
import { NotificationModule } from 'src/notification/notification.module';
import { Employee } from 'src/employee/entities/employee.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([GeneralRequest, Employee]),
    EmployeeModule,
    NotificationModule,
  ],
  controllers: [GeneralRequestController],
  providers: [GeneralRequestService],
  exports: [GeneralRequestService],
})
export class GeneralRequestModule {}
