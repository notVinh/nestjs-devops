import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdatePurchaseOrderStatusDto {
  @ApiProperty({ example: 'processing' })
  @IsNotEmpty()
  @IsString()
  status: string; // processing, completed, cancelled

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
