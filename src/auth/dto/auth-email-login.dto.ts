import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AuthEmailLoginDto {
  @ApiProperty({ example: '88888' })
  @IsNotEmpty()
  phone: string;

  @ApiProperty()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ required: false, description: 'FCM token for push notifications' })
  @IsOptional()
  @IsString()
  fcm?: string;
}
