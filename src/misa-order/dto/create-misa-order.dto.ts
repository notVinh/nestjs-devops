import { IsNotEmpty, IsString, IsOptional, IsDateString, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMisaOrderItemDto {
  @IsOptional()
  @IsString() 
  @ApiProperty({ description: 'Mã sản phẩm' })
  productCode?: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Tên sản phẩm' })
  productName: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Đơn vị' })
  unit?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @ApiProperty({ description: 'Số lượng' })
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @ApiProperty({ description: 'Đơn giá' })
  unitPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @ApiProperty({ description: 'Thành tiền' })
  totalPrice?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Ghi chú' })
  notes?: string;
}

export class CreateMisaOrderDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Số đơn hàng' })
  orderNumber: string;

  @IsNotEmpty()
  @IsDateString()
  @ApiProperty({ description: 'Ngày đặt hàng' })
  orderDate: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Tên khách hàng' })
  customerName: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Số điện thoại khách hàng' })
  customerPhone?: string;

  @IsOptional()
  @IsString() 
  @ApiProperty({ description: 'Địa chỉ khách hàng' })
  customerAddress?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Mã số thuế khách hàng' })
  customerTaxCode?: string;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ description: 'ID nhà máy' })
  factoryId: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'URL của file' })
  fileUrl?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Ghi chú' })
  notes?: string;

  @IsOptional()
  @IsDateString() 
  @ApiProperty({ description: 'Ngày giao hàng' })
  deliveryDate?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Địa điểm giao hàng' })
  deliveryLocation?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Điều kiện thanh toán' })
  paymentTerms?: string;

  @IsNotEmpty()
  @IsArray()
  @ApiProperty({ description: 'Danh sách sản phẩm' })
  @ValidateNested({ each: true })
  @Type(() => CreateMisaOrderItemDto)
  items: CreateMisaOrderItemDto[];
}
