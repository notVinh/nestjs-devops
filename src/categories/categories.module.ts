import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { CategoryTranslation } from './entities/category-translation.entity';
import { MisaInventoryBalance } from 'src/misa-token/entities/misa-inventory-balance.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category,
      CategoryTranslation,
      MisaInventoryBalance,
    ]), // Đăng ký Repository tại đây
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
