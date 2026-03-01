// dto/update-detailed-price.dto.ts
import {
  IsNumber,
  IsArray,
  ValidateNested,
  IsString,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

class UpdateItemDto {
  @IsNumber()
  id: number; // ID của quotation_item

  @IsNumber()
  unitPrice: number;

  @IsString()
  @IsOptional()
  confirmationToken: string; // Thêm trường này để xác nhận token khi admin cập nhật giá
}

export class UpdateDetailedPriceDto {
  @IsNumber()
  quotationId: number;

  @IsNumber()
  totalPrice: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateItemDto)
  items: UpdateItemDto[];
}
