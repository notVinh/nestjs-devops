import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
  IsNumber,
} from 'class-validator';

export class CreatePurchaseOrderItemDto {
  @ApiProperty({ example: 'CH-2210-QXMOTO', required: false })
  @IsOptional()
  @IsString()
  productCode?: string;

  @ApiProperty({ example: 'Motor chân vịt LT Chnki PT2210, 3020' })
  @IsNotEmpty()
  @IsString()
  productName: string;

  @ApiProperty({ example: 'Cái', required: false })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ example: 1.0 })
  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 3000000, required: false })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiProperty({ example: 3000000, required: false })
  @IsOptional()
  @IsNumber()
  totalPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ example: 'ĐMH1759' })
  @IsNotEmpty()
  @IsString()
  orderNumber: string;

  @ApiProperty({ example: '2025-11-24' })
  @IsNotEmpty()
  @IsDateString()
  orderDate: string;

  @ApiProperty({ example: 'Cửa hàng máy may Đại Cường' })
  @IsNotEmpty()
  @IsString()
  supplierName: string;

  @ApiProperty({ example: '0986997255', required: false })
  @IsOptional()
  @IsString()
  supplierPhone?: string;

  @ApiProperty({ example: 'Số 90, Phố Gia Quất, Long Biên, Hà Nội', required: false })
  @IsOptional()
  @IsString()
  supplierAddress?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  supplierTaxCode?: string;

  @ApiProperty({ example: '2025-11-30', required: false })
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deliveryLocation?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreatePurchaseOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items: CreatePurchaseOrderItemDto[];
}
