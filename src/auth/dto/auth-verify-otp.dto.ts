import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AuthVerifyOtpDto {
  @ApiProperty({ example: '0123456789' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty()
  @IsString()
  otp: string;
}
