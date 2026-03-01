import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HolidayService } from './holiday.service';
import { HolidayController } from './holiday.controller';
import { Holiday } from './entities/holiday.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Holiday])],
  controllers: [HolidayController],
  providers: [HolidayService],
  exports: [HolidayService],
})
export class HolidayModule {}
