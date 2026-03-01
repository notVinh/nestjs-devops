import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  throwUnprocessableEntityError,
  throwBadRequestError,
  throwUnauthorizedError,
} from '../utils/error.helper';
import ms from 'ms';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity';
import bcrypt from 'bcryptjs';
import { AuthEmailLoginDto } from './dto/auth-email-login.dto';
import { AuthUpdateDto } from './dto/auth-update.dto';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { RoleEnum } from 'src/roles/roles.enum';
import { StatusEnum } from 'src/statuses/statuses.enum';
import crypto from 'crypto';
import { plainToClass } from 'class-transformer';
import { Status } from 'src/statuses/entities/status.entity';
import { Role } from 'src/roles/entities/role.entity';
import { SocialInterface } from 'src/social/interfaces/social.interface';
import { AuthRegisterLoginDto } from './dto/auth-register-login.dto';
import { UsersService } from 'src/users/users.service';
import { ForgotService } from 'src/forgot/forgot.service';
import { MailService } from 'src/mail/mail.service';
import { NullableType } from '../utils/types/nullable.type';
import { LoginResponseType } from './types/login-response.type';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from 'src/config/config.type';
import { SessionService } from 'src/session/session.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from 'src/employee/entities/employee.entity';
import { JwtRefreshPayloadType } from './strategies/types/jwt-refresh-payload.type';
import { Session } from 'src/session/entities/session.entity';
import { JwtPayloadType } from './strategies/types/jwt-payload.type';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private forgotService: ForgotService,
    private sessionService: SessionService,
    private mailService: MailService,
    private configService: ConfigService<AllConfigType>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    private notificationService: NotificationService
  ) {}

  // Hàm đăng nhập
  async validateLogin(loginDto: AuthEmailLoginDto): Promise<LoginResponseType> {
    // Kiểm tra người dùng có tồn tại không
    const user = await this.usersService.findOne({
      phone: loginDto.phone,
    });
    // Nếu người dùng không tồn tại, trả về lỗi
    if (!user) {
      throwUnprocessableEntityError('Sai thông tin đăng nhập');
    }

    // Kiểm tra mật khẩu có khớp không
    const isValidPassword = await bcrypt.compare(
      loginDto.password,
      user.password
    );
    // Nếu mật khẩu không khớp, trả về lỗi
    if (!isValidPassword) {
      throwUnprocessableEntityError('Sai thông tin đăng nhập');
    }

    // Tạo session
    const session = await this.sessionService.create({
      user,
    });

    // Tạo token
    const { token, refreshToken, tokenExpires } = await this.getTokensData({
      id: user.id,
      role: user.role,
      sessionId: session.id,
    });

    // Lưu FCM token nếu có
    if (loginDto.fcm) {
      try {
        await this.notificationService.acceptPushNotification(
          { fcmToken: loginDto.fcm },
          user.id
        );
      } catch (error) {
        console.error('[Auth] Error saving FCM token:', error);
        // Không throw error để không ảnh hưởng đến login
      }
    }

    // Trả về dữ liệu đăng nhập
    return {
      refreshToken,
      token,
      tokenExpires,
      user,
    };
  }

  // Hàm đăng nhập bằng social
  async validateSocialLogin(
    authProvider: string,
    socialData: SocialInterface
  ): Promise<LoginResponseType> {
    let user: NullableType<User>;
    const socialEmail = socialData.email?.toLowerCase();

    const userByEmail = await this.usersService.findOne({
      email: socialEmail,
    });

    user = await this.usersService.findOne({
      socialId: socialData.id,
      provider: authProvider,
    });

    if (user) {
      if (socialEmail && !userByEmail) {
        user.email = socialEmail;
      }
      await this.usersService.update(user.id, user);
    } else if (userByEmail) {
      user = userByEmail;
    } else {
      const role = plainToClass(Role, {
        id: RoleEnum.employee,
      });
      const status = plainToClass(Status, {
        id: StatusEnum.active,
      });

      user = await this.usersService.create({
        email: socialEmail ?? null,
        firstName: socialData.firstName ?? null,
        lastName: socialData.lastName ?? null,
        socialId: socialData.id,
        provider: authProvider,
        role,
        status,
      });

      user = await this.usersService.findOne({
        id: user.id,
      });
    }

    if (!user) {
      throwUnprocessableEntityError('Người dùng không tồn tại');
    }

    const session = await this.sessionService.create({
      user,
    });

    const {
      token: jwtToken,
      refreshToken,
      tokenExpires,
    } = await this.getTokensData({
      id: user.id,
      role: user.role,
      sessionId: session.id,
    });

    return {
      refreshToken,
      token: jwtToken,
      tokenExpires,
      user,
    };
  }

  // Hàm đăng ký
  async register(dto: AuthRegisterLoginDto): Promise<void> {
    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    await this.usersService.create({
      ...dto,
      email: dto.email,
      role: {
        id: RoleEnum.employee,
      } as Role,
      status: {
        id: StatusEnum.inactive,
      } as Status,
      hash,
    });

    // TODO: Gửi mail
    // await this.mailService.userSignUp({
    //   to: dto.email,
    //   data: {
    //     hash,
    //   },
    // });
  }

  // Hàm quên mật khẩu - gửi OTP (email | zalo | sms)
  async forgotPassword(
    phone: string,
    channel: 'email' | 'zalo' | 'sms' = 'email'
  ): Promise<any> {
    // Kiểm tra người dùng có tồn tại không
    const user = await this.usersService.findOne({
      phone,
    });

    if (!user) {
      throwUnprocessableEntityError('Người dùng không tồn tại');
    }

    if (channel === 'email' && !user.email) {
      throwUnprocessableEntityError('Bạn chưa thêm email cho tài khoản, liên hệ với HCNS để được cấp lại mật khẩu mới');
    } else if (channel === 'zalo' && !user.zaloUserId) {
      throwUnprocessableEntityError('Bạn chưa có zaloUserId, liên hệ với HCNS để được cấp lại mật khẩu mới');
    } else if (channel === 'sms' && !user.phone) {
      throwUnprocessableEntityError('Bạn chưa thêm số điện thoại cho tài khoản, liên hệ với HCNS để được cấp lại mật khẩu mới');
    }

    // Tạo OTP 6 chữ số
    const otp = this.generateRandomString(6, 'otp');
    const expiresIn = 5; // 5 phút

    // Lưu OTP vào database (sử dụng forgot table để lưu OTP)
    await this.forgotService.create({
      hash: otp, // Sử dụng hash field để lưu OTP
      user,
    });

    // Gửi OTP qua email
    await this.mailService.forgotPassword({
      to: user.email as string,
      data: {
        otp,
        expiresIn,
      },
    });

    return user;
  }

  // Verify OTP và trả về reset token
  async verifyOtp(phone: string, otp: string): Promise<{ resetToken: string }> {
    const user = await this.usersService.findOne({
      phone,
    });

    if (!user) {
      throwUnprocessableEntityError('Người dùng không tồn tại');
    }

    const forgot = await this.forgotService.findOne({
      where: {
        hash: otp,
        user: {
          id: user.id,
        },
      },
    });

    if (!forgot) {
      throwUnprocessableEntityError('Mã OTP không hợp lệ');
    }

    // Kiểm tra OTP có hết hạn không
    if (this.isOtpExpired(forgot.createdAt, 5)) {
      await this.forgotService.softDelete(forgot.id);
      throwUnprocessableEntityError('Mã OTP đã hết hạn');
    }

    // Tạo reset token (token tạm thời để reset password)
    const resetToken = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    // Cập nhật hash trong forgot table thành reset token
    // Reset token có hiệu lực 10 phút
    await this.forgotService.update(forgot.id, {
      hash: resetToken,
    });

    return { resetToken };
  }

  // Reset password với reset token và mật khẩu mới từ người dùng
  async resetPassword(
    resetToken: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<void> {
    // Kiểm tra mật khẩu mới và xác nhận có khớp không
    if (newPassword !== confirmPassword) {
      throwUnprocessableEntityError(
        'Mật khẩu mới và xác nhận mật khẩu không khớp'
      );
    }

    // Tìm forgot record với reset token
    const forgot = await this.forgotService.findOne({
      where: {
        hash: resetToken,
      },
    });

    if (!forgot) {
      throwUnprocessableEntityError('Token reset không hợp lệ');
    }

    // Kiểm tra reset token có hết hạn không (10 phút)
    if (this.isOtpExpired(forgot.createdAt, 10)) {
      await this.forgotService.softDelete(forgot.id);
      throwUnprocessableEntityError('Token reset đã hết hạn');
    }

    const user = await this.usersService.findOne({
      id: forgot.user.id,
    });

    if (!user) {
      throwUnprocessableEntityError('Người dùng không tồn tại');
    }

    // Cập nhật password mới
    user.password = newPassword;
    await user.save();

    // Xóa tất cả session cũ
    await this.sessionService.softDelete({
      user: {
        id: user.id,
      },
    });

    // Xóa reset token đã sử dụng
    await this.forgotService.softDelete(forgot.id);
  }

  // Gửi OTP xác thực email mới
  async sendEmailVerification(userId: number, email: string): Promise<void> {
    // Kiểm tra email đã tồn tại chưa
    const existingUser = await this.usersService.findOne({ email });
    if (existingUser && existingUser.id !== userId) {
      throwUnprocessableEntityError('Email này đã được sử dụng bởi tài khoản khác');
    }

    // Lấy user hiện tại
    const user = await this.usersService.findOne({ id: userId });
    if (!user) {
      throwUnprocessableEntityError('Người dùng không tồn tại');
    }

    // Xóa các OTP cũ của user (nếu có)
    const oldOtps = await this.forgotService.findMany({
      where: { user: { id: userId } },
    });
    for (const oldOtp of oldOtps) {
      await this.forgotService.softDelete(oldOtp.id);
    }

    // Tạo OTP 6 chữ số
    const otp = this.generateRandomString(6, 'otp');
    const expiresIn = 5; // 5 phút

    // Lưu OTP vào database
    await this.forgotService.create({
      hash: `email_verify_${otp}`, // Prefix để phân biệt với OTP reset password
      user,
    });

    // Gửi OTP đến email MỚI
    await this.mailService.sendOtp({
      to: email,
      data: {
        otp,
        expiresIn,
      },
    });
  }

  // Xác thực OTP và cập nhật email
  async verifyAndUpdateEmail(userId: number, email: string, otp: string): Promise<void> {
    // Lấy user hiện tại
    const user = await this.usersService.findOne({ id: userId });
    if (!user) {
      throwUnprocessableEntityError('Người dùng không tồn tại');
    }

    // Kiểm tra OTP
    const forgot = await this.forgotService.findOne({
      where: {
        hash: `email_verify_${otp}`,
        user: {
          id: userId,
        },
      },
    });

    if (!forgot) {
      throwUnprocessableEntityError('Mã OTP không hợp lệ');
    }

    // Kiểm tra OTP có hết hạn không (5 phút)
    if (this.isOtpExpired(forgot.createdAt, 5)) {
      await this.forgotService.softDelete(forgot.id);
      throwUnprocessableEntityError('Mã OTP đã hết hạn');
    }

    // Kiểm tra email đã tồn tại chưa (double check)
    const existingUser = await this.usersService.findOne({ email });
    if (existingUser && existingUser.id !== userId) {
      throwUnprocessableEntityError('Email này đã được sử dụng bởi tài khoản khác');
    }

    // Cập nhật email
    await this.usersService.update(userId, { email });

    // Xóa OTP đã sử dụng
    await this.forgotService.softDelete(forgot.id);
  }

  // Reset password với OTP - gửi mật khẩu mới theo kênh (email | zalo | sms)
  // DEPRECATED: Không dùng nữa, giữ lại để tham khảo
  /* async resetPasswordOld(phone: string, otp: string, channel: 'email' | 'zalo' | 'sms' = 'sms'): Promise<void> {
    const user = await this.usersService.findOne({
      phone,
    });

    if (!user) {
      throwUnprocessableEntityError('Người dùng không tồn tại');
    }

    const forgot = await this.forgotService.findOne({
      where: {
        hash: otp,
        user: {
          id: user.id,
        },
      },
    });

    if (!forgot) {
      throwUnprocessableEntityError('Mã OTP không hợp lệ');
    }

    // Kiểm tra OTP có hết hạn không
    if (this.isOtpExpired(forgot.createdAt, 5)) {
      await this.forgotService.softDelete(forgot.id);
      throwUnprocessableEntityError('Mã OTP đã hết hạn');
    }

    // Tạo password mới
    const newPassword = this.generateRandomString(6, 'password');

    // Cập nhật password
    user.password = newPassword;
    await user.save();

    // Xóa tất cả session cũ
    await this.sessionService.softDelete({
      user: {
        id: user.id,
      },
    });

    // Xóa OTP đã sử dụng
    await this.forgotService.softDelete(forgot.id);

    if (channel === 'zalo') {
      if (!user.zaloUserId) {
        throwBadRequestError('Người dùng chưa có zaloUserId');
      }
      const employee = await this.employeeRepository.findOne({ where: { userId: user.id } });
      if (!employee?.factoryId) {
        throwBadRequestError('Không tìm thấy nhà máy của người dùng');
      }
      await this.zaloService.sendTextToZaloUser(
        employee.factoryId,
        String(user.zaloUserId),
        `Mật khẩu mới của bạn là: ${newPassword}. Vui lòng đăng nhập và đổi mật khẩu ngay.`,
      );
    } else if (channel === 'sms') {
      // Gửi password mới qua SMS
      await this.smsService.sendNewPassword(phone, newPassword);
    } else {
      // Gửi password mới qua email
      await this.mailService.sendNewPassword({
        to: user.email as string,
        data: {
          newPassword,
        },
      });
    }
  } */

  async me(userJwtPayload: JwtPayloadType): Promise<NullableType<User>> {
    return this.usersService.findOne({
      id: userJwtPayload.id,
    });
  }

  // Hàm đổi mật khẩu
  async changePassword(
    userJwtPayload: JwtPayloadType,
    changePasswordDto: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    }
  ): Promise<void> {
    // Kiểm tra mật khẩu mới và xác nhận mật khẩu có khớp không
    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throwUnprocessableEntityError(
        'Mật khẩu mới và xác nhận mật khẩu không khớp'
      );
    }

    // Lấy thông tin user hiện tại
    const currentUser = await this.usersService.findOne({
      id: userJwtPayload.id,
    });

    if (!currentUser) {
      throwUnprocessableEntityError('Người dùng không tồn tại');
    }

    // Kiểm tra mật khẩu hiện tại có đúng không
    const isValidCurrentPassword = await bcrypt.compare(
      changePasswordDto.currentPassword,
      currentUser.password
    );

    if (!isValidCurrentPassword) {
      throwUnprocessableEntityError('Mật khẩu hiện tại không đúng');
    }

    // Cập nhật mật khẩu mới
    await this.usersService.update(userJwtPayload.id, {
      password: changePasswordDto.newPassword,
      passwordChangedAt: new Date(),
    });

    // Xóa tất cả session cũ (trừ session hiện tại)
    await this.sessionService.softDelete({
      user: {
        id: userJwtPayload.id,
      },
      excludeId: userJwtPayload.sessionId,
    });
  }

  async refreshToken(
    data: Pick<JwtRefreshPayloadType, 'sessionId'>
  ): Promise<Omit<LoginResponseType, 'user'>> {
    const session = await this.sessionService.findOne({
      where: {
        id: data.sessionId,
      },
    });

    if (!session) {
      throwUnauthorizedError('Unauthorized');
    }

    const { token, refreshToken, tokenExpires } = await this.getTokensData({
      id: session.user.id,
      role: session.user.role,
      sessionId: session.id,
    });

    return {
      token,
      refreshToken,
      tokenExpires,
    };
  }

  async softDelete(user: User): Promise<void> {
    await this.usersService.softDelete(user.id);
  }

  async logout(data: Pick<JwtRefreshPayloadType, 'sessionId'>) {
    return this.sessionService.softDelete({
      id: data.sessionId,
    });
  }

  private async getTokensData(data: {
    id: User['id'];
    role: User['role'];
    sessionId: Session['id'];
  }) {
    const tokenExpiresIn = this.configService.getOrThrow('auth.expires', {
      infer: true,
    });

    const tokenExpires = Date.now() + ms(tokenExpiresIn);

    const [token, refreshToken] = await Promise.all([
      await this.jwtService.signAsync(
        {
          id: data.id,
          role: data.role,
          sessionId: data.sessionId,
        },
        {
          secret: this.configService.getOrThrow('auth.secret', { infer: true }),
          expiresIn: tokenExpiresIn,
        }
      ),
      await this.jwtService.signAsync(
        {
          sessionId: data.sessionId,
        },
        {
          secret: this.configService.getOrThrow('auth.refreshSecret', {
            infer: true,
          }),
          expiresIn: this.configService.getOrThrow('auth.refreshExpires', {
            infer: true,
          }),
        }
      ),
    ]);

    return {
      token,
      refreshToken,
      tokenExpires,
    };
  }

  // Tạo password ngẫu nhiên
  private generateRandomString(
    length: number = 6,
    type: 'otp' | 'password' = 'password'
  ): string {
    let chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    if (type === 'otp') {
      chars = '0123456789';
    }
    let result = '';

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }

  private isOtpExpired(createdAt: Date, expiresInMinutes: number = 5): boolean {
    // Tạm bỏ check expire do timezone server chưa đồng bộ
    return false;
  }
}
