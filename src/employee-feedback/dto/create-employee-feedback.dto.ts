import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsArray,
  MaxLength,
  IsNumber,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { FeedbackPriority } from '../entities/employee-feedback.entity';

export class CreateEmployeeFeedbackDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  factoryId: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  employeeId: number;

  @ApiProperty({ example: 'Đề xuất cải thiện khu vực nghỉ trưa' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'Nội dung chi tiết về góp ý...' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ enum: FeedbackPriority, default: 'medium' })
  @IsEnum(FeedbackPriority)
  @IsOptional()
  priority?: FeedbackPriority;

  @ApiPropertyOptional({
    type: [String],
    example: ['https://s3.../photo1.jpg'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];

  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  isAnonymous?: boolean;

  @ApiPropertyOptional({ example: 2, description: 'ID của nhân viên được giao xử lý feedback' })
  @IsNumber()
  @IsOptional()
  assignedEmployeeId?: number;
}
