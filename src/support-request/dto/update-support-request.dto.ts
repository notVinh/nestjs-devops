import {
  IsString,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsNumber,
  IsInt,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SupportRequestItemDto } from './create-support-request.dto';

export class UpdateSupportRequestDto {
  @ApiProperty({
    description: 'Trạng thái: "cancelled" để hủy, "approved"/"rejected" để duyệt/từ chối, hoặc không truyền để chỉ cập nhật thông tin',
    enum: ['cancelled', 'approved', 'rejected'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['cancelled', 'approved', 'rejected'])
  status?: 'cancelled' | 'approved' | 'rejected';

  @ApiProperty({
    description: 'Danh sách ID nhân viên duyệt đơn',
    type: [Number],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Phải chọn ít nhất 1 người duyệt' })
  @IsInt({ each: true })
  approverEmployeeIds?: number[];

  @ApiProperty({
    description: 'Danh sách các loại hỗ trợ',
    type: [SupportRequestItemDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Phải chọn ít nhất 1 loại hỗ trợ' })
  @ValidateNested({ each: true })
  @Type(() => SupportRequestItemDto)
  items?: SupportRequestItemDto[];

  @ApiProperty({ description: 'Ghi chú chung', required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ 
    description: 'Ghi chú quyết định (khi duyệt/từ chối)', 
    required: false 
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  decisionNote?: string;
}
