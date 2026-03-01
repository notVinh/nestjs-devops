import { IsInt, IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupportTypeDto {
  @ApiProperty({ description: 'ID nhà máy' })
  @IsInt()
  factoryId: number;

  @ApiProperty({ description: 'Mã loại hỗ trợ', example: 'overnight_x50' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'Tên loại hỗ trợ', example: 'Qua đêm x50' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Đơn vị', example: 'ngày', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({ description: 'Yêu cầu ảnh chứng minh', default: false })
  @IsOptional()
  @IsBoolean()
  requirePhoto?: boolean;

  @ApiProperty({ description: 'Yêu cầu nhập số lượng', default: false })
  @IsOptional()
  @IsBoolean()
  requireQuantity?: boolean;
}
