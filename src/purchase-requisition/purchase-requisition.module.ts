import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseRequisitionController } from './purchase-requisition.controller';
import { PurchaseRequisitionService } from './purchase-requisition.service';
import { PurchaseRequisition } from './entities/purchase-requisition.entity';
import { Employee } from 'src/employee/entities/employee.entity';
import { MisaOrder } from 'src/misa-order/entities/misa-order.entity';
import { MisaSaOrder } from 'src/misa-token/entities/misa-sa-order.entity';
import { NotificationModule } from 'src/notification/notification.module';
import { MisaOrderModule } from 'src/misa-order/misa-order.module';
import { EmployeeModule } from 'src/employee/employee.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseRequisition, Employee, MisaOrder, MisaSaOrder]),
    NotificationModule,
    forwardRef(() => MisaOrderModule),
    forwardRef(() => EmployeeModule),
  ],
  controllers: [PurchaseRequisitionController],
  providers: [PurchaseRequisitionService],
  exports: [PurchaseRequisitionService],
})
export class PurchaseRequisitionModule {}
