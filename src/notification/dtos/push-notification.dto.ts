import { IsString, IsOptional, IsNumber } from 'class-validator';

export class PushNotificationDto {
  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsNumber()
  referenceId?: number;

  @IsOptional()
  metadata?: Record<string, any>;
}
