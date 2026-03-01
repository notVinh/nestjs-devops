import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MisaTokenService } from './misa-token.service';
import { MisaTokenController } from './misa-token.controller';
import { MisaToken } from './entities/misa-token.entity';
import { MisaApiConfig } from './entities/misa-api-config.entity';
import { MisaDataSource } from './entities/misa-data-source.entity';
import { MisaSyncHistory } from './entities/misa-sync-history.entity';
import { MisaCustomer } from './entities/misa-customer.entity';
import { MisaProduct } from './entities/misa-product.entity';
import { MisaStock } from './entities/misa-stock.entity';
import { MisaSaOrder } from './entities/misa-sa-order.entity';
import { MisaSaOrderDetail } from './entities/misa-sa-order-detail.entity';
import { MisaSaOrderWorkflowHistory } from './entities/misa-sa-order-workflow-history.entity';
import { MisaSaOrderAssignment } from './entities/misa-sa-order-assignment.entity';
import { MisaSaOrderTaskReport } from './entities/misa-sa-order-task-report.entity';
import { MisaPuOrder } from './entities/misa-pu-order.entity';
import { MisaPuOrderDetail } from './entities/misa-pu-order-detail.entity';
import { MisaDataSourceController } from './misa-data-source.controller';
import { MisaDataSourceService } from './misa-data-source.service';
// Services mới được tách ra
import { MisaApiService } from './services/misa-api.service';
import { MisaNotificationHelper } from './services/misa-notification.helper';
import { MisaWorkflowService } from './services/misa-workflow.service';
import { MisaAssignmentService } from './services/misa-assignment.service';
import { UsersModule } from 'src/users/users.module';
import { EmployeeModule } from 'src/employee/employee.module';
import { NotificationModule } from 'src/notification/notification.module';
import { Employee } from 'src/employee/entities/employee.entity';
import { PurchaseRequisition } from 'src/purchase-requisition/entities/purchase-requisition.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MisaToken,
      MisaApiConfig,
      MisaDataSource,
      MisaSyncHistory,
      MisaCustomer,
      MisaProduct,
      MisaStock,
      MisaSaOrder,
      MisaSaOrderDetail,
      MisaSaOrderWorkflowHistory,
      MisaSaOrderAssignment,
      MisaSaOrderTaskReport,
      MisaPuOrder,
      MisaPuOrderDetail,
      Employee,
      PurchaseRequisition,
    ]),
    UsersModule,
    forwardRef(() => EmployeeModule),
    forwardRef(() => NotificationModule),
  ],
  controllers: [MisaTokenController, MisaDataSourceController],
  providers: [
    MisaTokenService,
    MisaApiService,
    MisaNotificationHelper,
    MisaWorkflowService,
    MisaAssignmentService,
    MisaDataSourceService,
  ],
  exports: [
    MisaTokenService,
    MisaDataSourceService,
    MisaApiService,
    MisaNotificationHelper,
    MisaWorkflowService,
    MisaAssignmentService,
  ],
})
export class MisaTokenModule {}
