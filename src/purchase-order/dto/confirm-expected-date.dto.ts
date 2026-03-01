import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';

export class ConfirmExpectedDateDto {
  @ApiProperty({ description: 'Thời gian hàng về dự kiến', required: true })
  @IsNotEmpty({ message: 'Ngày dự kiến hàng về không được để trống' })
  @IsDateString()
  expectedDeliveryDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
