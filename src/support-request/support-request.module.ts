import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportRequest } from './entities/support-request.entity';
import { SupportRequestItem } from './entities/support-request-item.entity';
import { SupportType } from 'src/support-type/entities/support-type.entity';
import { Employee } from 'src/employee/entities/employee.entity';
import { Factory } from 'src/factory/entities/factory.entity';
import { SupportRequestController } from './support-request.controller';
import { SupportRequestService } from './support-request.service';
import { EmployeeModule } from 'src/employee/employee.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SupportRequest,
      SupportRequestItem,
      SupportType,
      Employee,
      Factory,
    ]),
    EmployeeModule,
    NotificationModule,
  ],
  controllers: [SupportRequestController],
  providers: [SupportRequestService],
  exports: [SupportRequestService],
})
export class SupportRequestModule {}
