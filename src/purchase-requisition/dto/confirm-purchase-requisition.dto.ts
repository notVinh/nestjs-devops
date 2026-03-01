import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ConfirmPurchaseRequisitionDto {
  @ApiProperty({
    description: 'Ghi chú khi xác nhận mua hàng',
    example: 'Đã đặt hàng, dự kiến giao trong 3 ngày',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
