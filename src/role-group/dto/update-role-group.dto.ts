import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class UpdateRoleGroupDto {
  @ApiProperty({ description: 'Tên nhóm phân quyền', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Mô tả nhóm', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Có quyền truy cập admin', required: false })
  @IsBoolean()
  @IsOptional()
  canAccessAdmin?: boolean;

  @ApiProperty({ description: 'Danh sách menu keys được phép truy cập', type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  adminMenuKeys?: string[];

  @ApiProperty({ description: 'Danh sách permissions', type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @ApiProperty({ description: 'Trạng thái nhóm', required: false })
  @IsString()
  @IsOptional()
  status?: string;
}

