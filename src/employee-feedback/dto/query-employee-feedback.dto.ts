import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  FeedbackStatus,
  FeedbackPriority,
} from '../entities/employee-feedback.entity';

export class QueryEmployeeFeedbackDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: FeedbackStatus })
  @IsOptional()
  @IsEnum(FeedbackStatus)
  status?: FeedbackStatus;

  @ApiPropertyOptional({ enum: FeedbackPriority })
  @IsOptional()
  @IsEnum(FeedbackPriority)
  priority?: FeedbackPriority;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  employeeId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  factoryId?: number;

  @ApiPropertyOptional({ example: 'true', description: 'Chỉ lấy các góp ý chưa xem' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  unviewedOnly?: boolean;
}
