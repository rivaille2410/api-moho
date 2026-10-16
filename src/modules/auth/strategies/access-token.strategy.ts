import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';

import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AppConfig } from '@/config/app-config';
import { UsersService } from '@/modules/users/users.service';
import { PrismaService } from '@/prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  sid?: string;
}

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-access',
) {
  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow('jwt.accessSecret', { infer: true }),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (!payload.sid) {
      throw new UnauthorizedException('Session is no longer active');
    }

    const activeSession = await this.prisma.refreshToken.findFirst({
      where: {
        userId: user.id,
        sessionId: payload.sid,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (!activeSession) {
      throw new UnauthorizedException('Session is no longer active');
    }

    if (user.bannedAt) {
      throw new UnauthorizedException({
        code: 'ACCOUNT_BANNED',
        message: 'This account has been banned',
      });
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
    };
  }
}
