import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AuthResetPasswordDto {
  @ApiProperty({ example: 'abc123' })
  @IsNotEmpty()
  @IsString()
  resetToken: string;

  @ApiProperty({ example: 'newPassword123' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  newPassword: string;

  @ApiProperty({ example: 'newPassword123' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  confirmPassword: string;
}
