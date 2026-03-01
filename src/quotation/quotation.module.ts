import { Module } from '@nestjs/common';
import { QuotationService } from './quotation.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quotation } from './entities/quotation.entity';
import { QuotationItem } from './entities/quotation-item.entity';
import { QuotationController } from './quotation.controller';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [MailModule, TypeOrmModule.forFeature([Quotation, QuotationItem])],
  controllers: [QuotationController],
  providers: [QuotationService],
})
export class QuotationModule {}
