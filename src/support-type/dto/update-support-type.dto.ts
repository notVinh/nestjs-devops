import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSupportTypeDto {
  @ApiProperty({ description: 'Tên loại hỗ trợ', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ description: 'Đơn vị', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({ description: 'Yêu cầu ảnh chứng minh', required: false })
  @IsOptional()
  @IsBoolean()
  requirePhoto?: boolean;

  @ApiProperty({ description: 'Yêu cầu nhập số lượng', required: false })
  @IsOptional()
  @IsBoolean()
  requireQuantity?: boolean;

  @ApiProperty({ description: 'Trạng thái hoạt động', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
