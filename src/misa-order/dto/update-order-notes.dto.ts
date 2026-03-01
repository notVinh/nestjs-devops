import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrderNotesDto {
  @ApiProperty({
    description: 'Ghi chú cho đơn hàng (ví dụ: số lượng cần đặt thêm)',
    example: 'Đơn đặt 5 máy, kho có 3 máy, cần mua thêm 2 máy',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
