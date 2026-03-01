import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Min, Max } from 'class-validator';

export class ExportSupportRequestDto {
  @ApiProperty({ 
    example: 2024, 
    description: 'Năm export' 
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(2020)
  @Max(2030)
  year: number;

  @ApiProperty({ 
    example: 1, 
    description: 'Tháng export (1-12)' 
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ 
    example: 1, 
    description: 'ID nhà máy' 
  })
  @IsNotEmpty()
  @IsNumber()
  factoryId: number;
}

