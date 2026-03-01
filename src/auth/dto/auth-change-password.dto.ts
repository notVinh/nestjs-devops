import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class AuthChangePasswordDto {
  @ApiProperty({ example: 'oldPassword123' })
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'newPassword123' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
  newPassword: string;

  @ApiProperty({ example: 'newPassword123' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6, { message: 'Xác nhận mật khẩu phải có ít nhất 6 ký tự' })
  confirmPassword: string;
}
