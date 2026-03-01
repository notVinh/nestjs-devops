import {
  IsInt,
  IsString,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsNumber,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SupportRequestItemDto {
  @ApiProperty({ description: 'ID loại hỗ trợ' })
  @Type(() => Number)
  @IsInt()
  supportTypeId: number;

  @ApiProperty({ description: 'Số lượng (1 cho qua đêm, số km cho xe)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  quantity?: number;

  @ApiProperty({
    description: 'Ảnh chứng minh',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];

  @ApiProperty({ description: 'Ghi chú cho item', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CreateSupportRequestDto {
  @ApiProperty({ description: 'ID nhà máy' })
  @Type(() => Number)
  @IsInt()
  factoryId: number;

  @ApiProperty({ description: 'Ngày yêu cầu hỗ trợ', example: '2024-12-04' })
  @IsDateString()
  requestDate: string;

  @ApiProperty({
    description: 'Danh sách ID nhân viên duyệt đơn',
    type: [Number],
    example: [2, 3, 14],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Phải chọn ít nhất 1 người duyệt' })
  @Type(() => Number)
  @IsInt({ each: true })
  approverEmployeeIds: number[];

  @ApiProperty({
    description: 'Danh sách các loại hỗ trợ',
    type: [SupportRequestItemDto],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Phải chọn ít nhất 1 loại hỗ trợ' })
  @ValidateNested({ each: true })
  @Type(() => SupportRequestItemDto)
  items: SupportRequestItemDto[];

  @ApiProperty({ description: 'Ghi chú chung', required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ 
    description: 'ID đơn yêu cầu hỗ trợ gốc (nếu đây là đơn bổ sung)', 
    required: false 
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentSupportRequestId?: number;
}
