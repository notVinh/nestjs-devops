import { IsOptional, IsNumber, IsString, IsDateString, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetMisaOrdersDto {
  @ApiPropertyOptional({ description: 'Trang hiện tại', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số lượng mỗi trang', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Ngày bắt đầu (YYYY-MM-DD)', example: '2025-11-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Ngày kết thúc (YYYY-MM-DD)', example: '2025-11-30' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái đơn hàng',
    example: 'pendingApproval',
    enum: ['pendingApproval', 'approved', 'assigned', 'processing', 'completed', 'cancelled']
  })
  @IsOptional()
  @IsString()
  status?: string;
}
