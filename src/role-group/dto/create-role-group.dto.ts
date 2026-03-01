import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray } from 'class-validator';

export class CreateRoleGroupDto {
  @ApiProperty({ description: 'Tên nhóm phân quyền' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Mô tả nhóm', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'ID nhà máy' })
  @IsNumber()
  @IsNotEmpty()
  factoryId: number;

  @ApiProperty({ description: 'Có quyền truy cập admin', default: false, required: false })
  @IsBoolean()
  @IsOptional()
  canAccessAdmin?: boolean;

  @ApiProperty({ description: 'Danh sách menu keys được phép truy cập', type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  adminMenuKeys?: string[];

  @ApiProperty({ description: 'Danh sách permissions (MISA orders, HR notifications)', type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @ApiProperty({ description: 'Trạng thái nhóm', default: 'active', required: false })
  @IsString()
  @IsOptional()
  status?: string;
}

