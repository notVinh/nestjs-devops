import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApprovePurchaseRequisitionDto {
  @ApiProperty({
    description: 'Ghi chú khi duyệt',
    example: 'Đã duyệt, tiến hành đặt hàng',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
