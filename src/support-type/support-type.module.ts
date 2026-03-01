import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportType } from './entities/support-type.entity';
import { SupportTypeController } from './support-type.controller';
import { SupportTypeService } from './support-type.service';

@Module({
  imports: [TypeOrmModule.forFeature([SupportType])],
  controllers: [SupportTypeController],
  providers: [SupportTypeService],
  exports: [SupportTypeService],
})
export class SupportTypeModule {}
