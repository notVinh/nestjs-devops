import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OvertimeCoefficient } from './entities/overtime-coefficient.entity';
import { OvertimeCoefficientService } from './overtime-coefficient.service';
import { OvertimeCoefficientController } from './overtime-coefficient.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OvertimeCoefficient])],
  controllers: [OvertimeCoefficientController],
  providers: [OvertimeCoefficientService],
  exports: [OvertimeCoefficientService],
})
export class OvertimeCoefficientModule {}
