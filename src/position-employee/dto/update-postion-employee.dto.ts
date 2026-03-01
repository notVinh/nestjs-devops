import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdatePositionEmployeeDto {
  @ApiProperty({ example: 'Quản lý' })
  @IsOptional()
  @IsString()
  name: string;

  @ApiProperty({ example: 'Quản lý' })
  @IsOptional()
  @IsString()
  description: string;
}
