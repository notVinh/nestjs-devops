import { PartialType } from '@nestjs/swagger';
import { CreateGeneralRequestDto } from './create-general-request.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateGeneralRequestDto extends PartialType(CreateGeneralRequestDto) {
  @ApiPropertyOptional({ enum: ['pending', 'approved', 'rejected', 'cancelled'] })
  @IsEnum(['pending', 'approved', 'rejected', 'cancelled'])
  @IsOptional()
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';

  @ApiPropertyOptional({ description: 'Ghi chú khi duyệt đơn' })
  @IsString()
  @IsOptional()
  decisionNote?: string;
}
