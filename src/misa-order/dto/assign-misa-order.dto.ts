import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AssignMisaOrderDto {
  // Support both old (single) and new (array) format
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @ApiProperty({ description: 'ID của nhân viên được giao việc', example: 1 })
  assignedToEmployeeId?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map(v => (typeof v === 'string' ? Number(v) : v));
    }
    return value;
  })
  @ApiProperty({
    description: 'ID của nhân viên được giao việc',
    example: [1, 2, 3],
  })
  assignedToEmployeeIds?: number[];

  @IsOptional()
  @IsString()
  @IsIn([
    'warehouse',
    'quality_check',
    'delivery',
    'gate_control',
    'self_delivery',
    'installation',
    'shipping_company',
    'general',
  ])
  @ApiProperty({
    description: 'Bước công việc',
    enum: [
      'warehouse',
      'quality_check',
      'delivery',
      'gate_control',
      'self_delivery',
      'installation',
      'shipping_company',
      'general',
    ],
    example: 'warehouse',
  })
  step?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Ghi chú', example: 'Đơn đặt 5 máy, kho có 3 máy, cần mua thêm 2 máy' })
  notes?: string;

  // Shipping company info (only for step = shipping_company)
  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Tên công ty vận chuyển', example: 'Công ty vận chuyển 1' })
  shippingCompanyName?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Số điện thoại công ty vận chuyển', example: '0909090909' })
  shippingCompanyPhone?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Địa chỉ công ty vận chuyển', example: '123 Đường ABC, Quận XYZ, TP. HCM' })
  shippingCompanyAddress?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Mã vận đơn', example: '1234567890' })
  trackingNumber?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiProperty({ description: 'URLs của các file', example: ['https://example.com/file1.pdf', 'https://example.com/file2.pdf'] })
  photoUrls?: string[];
}
