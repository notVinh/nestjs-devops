import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsDate,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAttendanceDto {
  @ApiProperty({
    example: '2024-01-01T08:00:00',
    description: 'Giờ check-in (ISO format)',
    required: false
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  checkInTime?: Date;

  @ApiProperty({
    example: '2024-01-01T17:00:00',
    description: 'Giờ check-out (ISO format)',
    required: false
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  checkOutTime?: Date;

  @ApiProperty({
    example: 2.5,
    description: 'Số giờ tăng ca',
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Giờ tăng ca phải >= 0' })
  overtimeHours?: number;
}
