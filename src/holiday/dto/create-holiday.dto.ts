import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsDateString, IsInt, IsOptional, IsBoolean, IsNumber, Min, Max } from 'class-validator';

export class CreateHolidayDto {
  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @IsInt()
  factoryId: number;

  @ApiProperty({ example: 'Tết Nguyên Đán' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: '2025-01-29' })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiProperty({ example: 2025 })
  @IsNotEmpty()
  @IsInt()
  year: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
