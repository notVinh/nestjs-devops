import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrderController } from './purchase-order.controller';
import { PurchaseOrderService } from './purchase-order.service';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { Employee } from 'src/employee/entities/employee.entity';
import { User } from 'src/users/entities/user.entity';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseOrder, PurchaseOrderItem, Employee, User]),
    NotificationModule,
  ],
  controllers: [PurchaseOrderController],
  providers: [PurchaseOrderService],
  exports: [PurchaseOrderService],
})
export class PurchaseOrderModule {}
