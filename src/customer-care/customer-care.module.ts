import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerCareService } from './customer-care.service';
import { CustomerCareController } from './customer-care.controller';
import { CustomerCare } from './entities/customer-care.entity';
import { MisaCustomer } from 'src/misa-token/entities/misa-customer.entity';
import { EmployeeModule } from 'src/employee/employee.module';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerCare, MisaCustomer]), EmployeeModule],
  controllers: [CustomerCareController],
  providers: [CustomerCareService],
  exports: [CustomerCareService],
})
export class CustomerCareModule {}
