import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { lowerCaseTransformer } from '../../utils/transformers/lower-case.transformer';

export class AuthVerifyEmailDto {
  @ApiProperty({ example: 'test@example.com' })
  @Transform(lowerCaseTransformer)
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString({ message: 'OTP phải là chuỗi' })
  @IsNotEmpty({ message: 'OTP không được để trống' })
  @Length(6, 6, { message: 'OTP phải có 6 ký tự' })
  otp: string;
}
