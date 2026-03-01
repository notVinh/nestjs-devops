import { IsInt, IsString, IsOptional, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ShiftType, DayType } from '../entities/overtime-coefficient.entity';

export class CreateOvertimeCoefficientDto {
  @ApiProperty({ description: 'ID nhà máy' })
  @IsInt()
  factoryId: number;

  @ApiProperty({ description: 'Tên ca làm', example: 'Ca đêm ngày thường' })
  @IsString()
  shiftName: string;

  @ApiProperty({ description: 'Hệ số nhân (%)', example: 150 })
  @IsNumber()
  coefficient: number;

  @ApiProperty({
    description: 'Loại ca',
    enum: ShiftType,
    example: ShiftType.DAY
  })
  @IsEnum(ShiftType)
  shiftType: ShiftType;

  @ApiProperty({
    description: 'Loại ngày',
    enum: DayType,
    example: DayType.WEEKDAY
  })
  @IsEnum(DayType)
  dayType: DayType;

  @ApiProperty({
    description: 'Đã làm ca ngày chưa (chỉ áp dụng cho ca đêm)',
    example: false,
    required: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  hasWorkedDayShift?: boolean;

  @ApiProperty({
    description: 'Mô tả chi tiết',
    example: 'Làm thêm giờ ban đêm vào ngày thường, chưa làm ca ngày',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Có đang hoạt động không',
    example: true,
    required: false,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
