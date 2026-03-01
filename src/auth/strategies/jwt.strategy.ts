import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { throwUnauthorizedError } from '../../utils/error.helper';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { OrNeverType } from '../../utils/types/or-never.type';
import { AllConfigType } from 'src/config/config.type';
import { JwtPayloadType } from './types/jwt-payload.type';
import { SessionService } from '../../session/session.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService<AllConfigType>,
    private sessionService: SessionService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('auth.secret', { infer: true }),
    });
  }

  public async validate(
    payload: JwtPayloadType,
  ): Promise<OrNeverType<JwtPayloadType>> {
    if (!payload.id) {
      throwUnauthorizedError('Không được phép truy cập');
    }

    // Check if session still exists (deleted when password reset)
    const session = await this.sessionService.findOne({
      where: { id: payload.sessionId },
    });

    if (!session) {
      throwUnauthorizedError('Phiên đăng nhập đã hết hạn');
    }

    // Check if password was changed after token was issued
    const user = await this.usersService.findOne({ id: payload.id });

    if (!user) {
      throwUnauthorizedError('Không tìm thấy tài khoản người dùng');
    }

    // If passwordChangedAt exists and is after token issued time, reject
    // if (user.passwordChangedAt) {
    //   const passwordChangedTimestamp = Math.floor(
    //     user.passwordChangedAt.getTime() / 1000,
    //   );
    //   if (passwordChangedTimestamp > payload.iat) {
    //     throwUnauthorizedError(
    //       'Mật khẩu đã thay đổi. Vui lòng đăng nhập lại.',
    //     );
    //   }
    // }

    return payload;
  }
}
