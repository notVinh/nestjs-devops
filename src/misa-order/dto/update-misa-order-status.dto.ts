import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMisaOrderStatusDto {
  @IsNotEmpty()
  @IsString()
  @IsIn(['processing', 'completed', 'cancelled'])
  @ApiProperty({ description: 'Trạng thái đơn hàng', enum: ['processing', 'completed', 'cancelled'] })
  status: 'processing' | 'completed' | 'cancelled';

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Ghi chú' })
  notes?: string;
}
