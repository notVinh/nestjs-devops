import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ShiftType, DayType } from '../entities/overtime-coefficient.entity';

export class UpdateOvertimeCoefficientDto {
  @ApiProperty({ description: 'Tên ca làm', required: false })
  @IsOptional()
  @IsString()
  shiftName?: string;

  @ApiProperty({ description: 'Hệ số nhân (%)', required: false })
  @IsOptional()
  @IsNumber()
  coefficient?: number;

  @ApiProperty({
    description: 'Loại ca',
    enum: ShiftType,
    required: false
  })
  @IsOptional()
  @IsEnum(ShiftType)
  shiftType?: ShiftType;

  @ApiProperty({
    description: 'Loại ngày',
    enum: DayType,
    required: false
  })
  @IsOptional()
  @IsEnum(DayType)
  dayType?: DayType;

  @ApiProperty({
    description: 'Đã làm ca ngày chưa',
    required: false
  })
  @IsOptional()
  @IsBoolean()
  hasWorkedDayShift?: boolean;

  @ApiProperty({
    description: 'Mô tả chi tiết',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Có đang hoạt động không',
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
