import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  MaxLength,
  IsNumber,
} from 'class-validator';
import {
  FeedbackPriority,
  FeedbackStatus,
} from '../entities/employee-feedback.entity';

export class UpdateEmployeeFeedbackDto {
  @ApiPropertyOptional({ example: 'Đề xuất cải thiện khu vực nghỉ trưa' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ example: 'Nội dung chi tiết về góp ý...' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ enum: FeedbackPriority })
  @IsEnum(FeedbackPriority)
  @IsOptional()
  priority?: FeedbackPriority;

  @ApiPropertyOptional({ enum: FeedbackStatus })
  @IsEnum(FeedbackStatus)
  @IsOptional()
  status?: FeedbackStatus;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];

  @ApiPropertyOptional({ example: 'Cảm ơn bạn đã góp ý...' })
  @IsString()
  @IsOptional()
  replyContent?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsNumber()
  @IsOptional()
  repliedByEmployeeId?: number;
}
