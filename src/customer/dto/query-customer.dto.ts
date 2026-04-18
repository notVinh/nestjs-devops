import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class QueryCustomerDto {
  @ApiPropertyOptional({ description: 'Trang hiện tại', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng mỗi trang',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description:
      'Tìm kiếm theo tên, mã, SĐT, địa chỉ...',
    example: 'Công ty ABC',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo rank: A / B / C / D',
    enum: ['A', 'B', 'C', 'D'],
  })
  @IsOptional()
  @IsEnum(['A', 'B', 'C', 'D'])
  rank?: 'A' | 'B' | 'C' | 'D';

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái inactive (true/false)',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  inactive?: boolean;

  @ApiPropertyOptional({
    description: 'Lọc theo loại: 0 = Cá nhân, 1 = Tổ chức',
  })
  @IsOptional()
  @Type(() => Number)
  accountObjectType?: number;

  @ApiPropertyOptional({
    description: 'Lọc danh sách KH theo nhân viên chăm sóc',
  })
  @IsOptional()
  @Type(() => Number)
  careById?: number;

  @ApiPropertyOptional({
    description: 'Sắp xếp theo trường, ví dụ: accountObjectName',
    example: 'accountObjectName',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Chiều sắp xếp: ASC hoặc DESC',
    enum: ['ASC', 'DESC'],
    example: 'ASC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
