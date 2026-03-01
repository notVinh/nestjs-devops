import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyProducionController } from './daily-producion.controller';
import { DailyProducionService } from './daily-producion.service';
import { DailyProduction } from './entities/daily-production.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DailyProduction])],
  controllers: [DailyProducionController],
  providers: [DailyProducionService],
  exports: [DailyProducionService],
})
export class DailyProducionModule {}
