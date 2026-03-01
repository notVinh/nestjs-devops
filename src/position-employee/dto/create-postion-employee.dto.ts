import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

export class CreatePositionEmployeeDto {
  @ApiProperty({ example: 'Quản lý' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'Quản lý' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @IsNumber()
  factoryId: number;

  @ApiProperty({ example: 1, description: 'ID phòng ban' })
  @IsNotEmpty()
  @IsNumber()
  departmentId: number;

  @ApiProperty({ example: 'active', description: 'Trạng thái vị trí', required: false })
  @IsString()
  @IsOptional()
  status?: string;
}
