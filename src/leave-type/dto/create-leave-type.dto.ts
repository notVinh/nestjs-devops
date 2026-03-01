import { IsInt, IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLeaveTypeDto {
  @ApiProperty({ description: 'ID nhà máy' })
  @IsInt()
  factoryId: number;

  @ApiProperty({ description: 'Mã loại nghỉ phép', example: 'ANNUAL_LEAVE' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'Tên loại nghỉ phép', example: 'Phép năm' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Có hưởng lương hay không',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @ApiProperty({
    description: 'Có trừ phép năm hay không',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  deductsFromAnnualLeave?: boolean;

  @ApiProperty({
    description: 'Mô tả chi tiết',
    example: 'Nghỉ phép năm theo quy định',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Có đang hoạt động không',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Thứ tự hiển thị',
    example: 0,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
