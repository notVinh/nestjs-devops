import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MisaCustomer } from 'src/misa-token/entities/misa-customer.entity';
import { Employee } from 'src/employee/entities/employee.entity';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';

@Module({
  imports: [
    // Dùng trực tiếp bảng misaCustomer – không phụ thuộc MISA API
    TypeOrmModule.forFeature([MisaCustomer, Employee]),
  ],
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [CustomerService],
})
export class CustomerModule {}
