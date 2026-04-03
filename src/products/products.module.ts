// products/products.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { MisaInventoryBalance } from 'src/misa-token/entities/misa-inventory-balance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, MisaInventoryBalance])],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}

