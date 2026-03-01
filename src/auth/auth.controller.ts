import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Request,
  Post,
  UseGuards,
  Patch,
  Delete,
  SerializeOptions,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthEmailLoginDto } from './dto/auth-email-login.dto';
import { AuthForgotPasswordDto } from './dto/auth-forgot-password.dto';
import { AuthResetPasswordDto } from './dto/auth-reset-password.dto';
import { AuthVerifyOtpDto } from './dto/auth-verify-otp.dto';
import { AuthSendEmailVerificationDto } from './dto/auth-send-email-verification.dto';
import { AuthVerifyEmailDto } from './dto/auth-verify-email.dto';
import { AuthUpdateDto } from './dto/auth-update.dto';
import { AuthChangePasswordDto } from './dto/auth-change-password.dto';
import { AuthGuard } from '@nestjs/passport';
import { AuthRegisterLoginDto } from './dto/auth-register-login.dto';
import { LoginResponseType } from './types/login-response.type';
import { User } from '../users/entities/user.entity';
import { ResponseHelper, BaseResponse } from '../utils/base-response';
import { HTTP_STATUS_CODE } from '../utils/constant';
import { NullableType } from '../utils/types/nullable.type';

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @SerializeOptions({
    groups: ['me'],
  })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  public async login(
    @Body() loginDto: AuthEmailLoginDto
  ): Promise<BaseResponse<LoginResponseType>> {
    const loginResponse = await this.service.validateLogin(loginDto);
    return ResponseHelper.success(
      loginResponse,
      'Đăng nhập thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Post('register')
  @HttpCode(HttpStatus.NO_CONTENT)
  async register(@Body() createUserDto: AuthRegisterLoginDto): Promise<void> {
    return this.service.register(createUserDto);
  }

  @Post('forgot/password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() forgotPasswordDto: AuthForgotPasswordDto
  ): Promise<BaseResponse<{ success: boolean }>> {
    try {
      const user = await this.service.forgotPassword(
        forgotPasswordDto.phone,
        forgotPasswordDto.channel
      );

      let message = 'OTP đã được gửi thành công.';
      if (forgotPasswordDto.channel === 'zalo') {
        message = 'OTP đã được gửi qua Zalo OA của nhà máy.';
      } else if (forgotPasswordDto.channel === 'sms') {
        message = 'OTP đã được gửi về số điện thoại của bạn. Vui lòng kiểm tra tin nhắn.';
      } else {
        message = 'OTP đã được gửi về email của bạn. Vui lòng kiểm tra hộp thư.';
      }

      return ResponseHelper.success(
        { success: true, email: user.email },
        message,
        HTTP_STATUS_CODE.OK
      );
    } catch (error) {
      const errorMessage =
        error?.response?.errors?.message ||
        error?.message ||
        'Có lỗi xảy ra khi gửi OTP';
      return ResponseHelper.error(errorMessage, HTTP_STATUS_CODE.BAD_REQUEST);
    }
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xác thực OTP và nhận reset token' })
  async verifyOtp(
    @Body() verifyOtpDto: AuthVerifyOtpDto
  ): Promise<BaseResponse<{ resetToken: string }>> {
    try {
      const result = await this.service.verifyOtp(
        verifyOtpDto.phone,
        verifyOtpDto.otp
      );

      return ResponseHelper.success(
        result,
        'Xác thực OTP thành công. Vui lòng nhập mật khẩu mới.',
        HTTP_STATUS_CODE.OK
      );
    } catch (error) {
      const errorMessage =
        error?.response?.errors?.message ||
        error?.message ||
        'Có lỗi xảy ra khi xác thực OTP';
      return ResponseHelper.error(errorMessage, HTTP_STATUS_CODE.BAD_REQUEST);
    }
  }

  @Post('reset/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đặt lại mật khẩu với reset token và mật khẩu mới' })
  async resetPassword(
    @Body() resetPasswordDto: AuthResetPasswordDto
  ): Promise<BaseResponse<{ success: boolean }>> {
    try {
      await this.service.resetPassword(
        resetPasswordDto.resetToken,
        resetPasswordDto.newPassword,
        resetPasswordDto.confirmPassword
      );

      return ResponseHelper.success(
        { success: true },
        'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.',
        HTTP_STATUS_CODE.OK
      );
    } catch (error) {
      const errorMessage =
        error?.response?.errors?.message ||
        error?.message ||
        'Có lỗi xảy ra khi đặt lại mật khẩu';
      return ResponseHelper.error(errorMessage, HTTP_STATUS_CODE.BAD_REQUEST);
    }
  }

  // DEPRECATED: API cũ - gửi mật khẩu mới qua email/sms/zalo
  // Giữ lại để tham khảo, không dùng nữa
  /* @Post('reset/password-old')
  @HttpCode(HttpStatus.OK)
  async resetPasswordWithOtp(
    @Body() resetPasswordOtpDto: any
  ): Promise<BaseResponse<{ success: boolean }>> {
    try {
      await this.service.resetPasswordOld(
        resetPasswordOtpDto.phone,
        resetPasswordOtpDto.otp,
        resetPasswordOtpDto.channel
      );

      let message = 'Mật khẩu đã được reset thành công.';
      if (resetPasswordOtpDto.channel === 'zalo') {
        message = 'Mật khẩu mới đã được gửi qua Zalo OA của nhà máy.';
      } else if (resetPasswordOtpDto.channel === 'sms') {
        message = 'Mật khẩu đã được reset thành công. Vui lòng kiểm tra tin nhắn SMS để lấy mật khẩu mới.';
      } else {
        message = 'Mật khẩu đã được reset thành công. Vui lòng kiểm tra email để lấy mật khẩu mới.';
      }

      return ResponseHelper.success(
        { success: true },
        message,
        HTTP_STATUS_CODE.OK
      );
    } catch (error) {
      return ResponseHelper.error(
        error.message || 'Có lỗi xảy ra khi reset mật khẩu',
        HTTP_STATUS_CODE.BAD_REQUEST
      );
    }
  } */

  @ApiBearerAuth()
  @SerializeOptions({
    groups: ['me'],
  })
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  public async me(
    @Request() request
  ): Promise<BaseResponse<NullableType<User>>> {
    return ResponseHelper.success(
      await this.service.me(request.user),
      'Lấy thông tin người dùng thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @ApiBearerAuth()
  @SerializeOptions({
    groups: ['me'],
  })
  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.OK)
  public async refresh(
    @Request() request
  ): Promise<BaseResponse<Omit<LoginResponseType, 'user'>>> {
    return ResponseHelper.success(
      await this.service.refreshToken({
        sessionId: request.user.sessionId,
      }),
      'Refresh token thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @ApiBearerAuth()
  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  public async logout(@Request() request): Promise<void> {
    await this.service.logout({
      sessionId: request.user.sessionId,
    });
  }

  @Post('change-password')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() request,
    @Body() changePasswordDto: AuthChangePasswordDto
  ): Promise<BaseResponse<{ success: boolean }>> {
    await this.service.changePassword(request.user, changePasswordDto);

    return ResponseHelper.success(
      { success: true },
      'Đổi mật khẩu thành công',
      HTTP_STATUS_CODE.OK
    );
  }

  @Post('send-email-verification')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi OTP xác thực email mới' })
  async sendEmailVerification(
    @Request() request,
    @Body() dto: AuthSendEmailVerificationDto
  ): Promise<BaseResponse<{ success: boolean }>> {
    try {
      await this.service.sendEmailVerification(request.user.id, dto.email);

      return ResponseHelper.success(
        { success: true },
        'OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.',
        HTTP_STATUS_CODE.OK
      );
    } catch (error) {
      const errorMessage =
        error?.response?.errors?.message ||
        error?.message ||
        'Có lỗi xảy ra khi gửi OTP';
      return ResponseHelper.error(errorMessage, HTTP_STATUS_CODE.BAD_REQUEST);
    }
  }

  @Post('verify-and-update-email')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xác thực OTP và cập nhật email mới' })
  async verifyAndUpdateEmail(
    @Request() request,
    @Body() dto: AuthVerifyEmailDto
  ): Promise<BaseResponse<{ success: boolean }>> {
    try {
      await this.service.verifyAndUpdateEmail(request.user.id, dto.email, dto.otp);

      return ResponseHelper.success(
        { success: true },
        'Cập nhật email thành công',
        HTTP_STATUS_CODE.OK
      );
    } catch (error) {
      const errorMessage =
        error?.response?.errors?.message ||
        error?.message ||
        'Có lỗi xảy ra khi xác thực OTP';
      return ResponseHelper.error(errorMessage, HTTP_STATUS_CODE.BAD_REQUEST);
    }
  }

  @ApiBearerAuth()
  @Delete('me')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  public async delete(@Request() request): Promise<void> {
    return this.service.softDelete(request.user);
  }
}
