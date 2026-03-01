import { ApiProperty } from "@nestjs/swagger";
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateDailyProductionDto {
  @ApiProperty({ example: '2025-10-17 00:00:00' })
  @IsOptional()
  date?: Date;

  @ApiProperty({ example: 'Product Name' })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiProperty({ example: 1 })
  @IsOptional()
  @IsNumber()
  quantity?: number;
  
  @ApiProperty({ example: 10000 })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiProperty({ example: 10000 })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty({ example: 10000 })
  @IsOptional()
  @IsNumber()
  totalPrice?: number;

  @ApiProperty({ example: 'Note' })
  @IsOptional()
  @IsString()
  note?: string;
}
