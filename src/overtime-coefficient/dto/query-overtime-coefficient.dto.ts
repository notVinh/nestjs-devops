import { IsInt, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ShiftType, DayType } from '../entities/overtime-coefficient.entity';

export class QueryOvertimeCoefficientDto {
  @ApiProperty({ description: 'ID nhà máy', required: false })
  @IsOptional()
  @IsInt()
  @Transform(({ value }) => parseInt(value))
  factoryId?: number;

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
    description: 'Có đang hoạt động không',
    required: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean;
}
