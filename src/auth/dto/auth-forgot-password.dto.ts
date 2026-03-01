import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AuthForgotPasswordDto {
  @ApiProperty({ example: '0123456789' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: 'sms', required: false, description: 'Kênh gửi OTP: email, zalo hoặc sms' })
  @IsOptional()
  @IsString()
  @IsIn(['email', 'zalo', 'sms'])
  channel?: 'email' | 'zalo' | 'sms';
}
  