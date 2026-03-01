import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ConfirmReceivedDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
