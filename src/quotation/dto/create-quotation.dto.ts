import {
  IsString,
  IsEmail,
  IsArray,
  ValidateNested,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

class QuotationItemDto {
  @IsString() // Đổi từ IsNumber sang IsString
  productId: string;

  @IsNumber()
  quantity: number;
}

export class CreateQuotationDto {
  @IsString() customerName: string;
  @IsEmail() customerEmail: string;
  @IsString() customerPhone: string;
  @IsOptional() @IsString() notes: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items: QuotationItemDto[];
}
