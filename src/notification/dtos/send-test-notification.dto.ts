import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class SendTestNotificationDto {
  @ApiProperty({ example: 'Test Notification' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'This is a test notification message' })
  @IsString()
  body: string;

  @ApiProperty({
    example: 1,
    required: false,
    description: 'User ID to send notification to (optional, defaults to current user)',
  })
  @IsNumber()
  @IsOptional()
  userId?: number;
}
