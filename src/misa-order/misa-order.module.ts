import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MisaOrder } from './entities/misa-order.entity';
import { MisaOrderItem } from './entities/misa-order-item.entity';
import { OrderAssignment } from './entities/order-assignment.entity';
import { Employee } from 'src/employee/entities/employee.entity';
import { Department } from 'src/deparments/entities/deparment.entity';
import { MisaOrderService } from './misa-order.service';
import { MisaOrderController } from './misa-order.controller';
import { NotificationModule } from 'src/notification/notification.module';
import { EmployeeModule } from 'src/employee/employee.module';
import { PurchaseRequisitionModule } from 'src/purchase-requisition/purchase-requisition.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MisaOrder,
      MisaOrderItem,
      OrderAssignment,
      Employee,
      Department,
    ]),
    NotificationModule,
    EmployeeModule,
    forwardRef(() => PurchaseRequisitionModule),
  ],
  controllers: [MisaOrderController],
  providers: [MisaOrderService],
  exports: [MisaOrderService],
})
export class MisaOrderModule {}
