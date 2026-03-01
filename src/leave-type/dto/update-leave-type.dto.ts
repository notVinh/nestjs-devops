import { IsString, IsOptional, IsBoolean, IsInt, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLeaveTypeDto {
  @ApiProperty({ description: 'Mã loại nghỉ phép', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiProperty({ description: 'Tên loại nghỉ phép', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    description: 'Có hưởng lương hay không',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @ApiProperty({
    description: 'Có trừ phép năm hay không',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  deductsFromAnnualLeave?: boolean;

  @ApiProperty({
    description: 'Mô tả chi tiết',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Có đang hoạt động không',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Thứ tự hiển thị',
    required: false,
  })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
