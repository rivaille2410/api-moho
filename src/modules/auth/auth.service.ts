import {
  Injectable,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { Prisma, Role } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '@/config/app-config';
import { PrismaService } from '@/prisma/prisma.service';
import { MailService } from '@/modules/mail/mail.service';
import { UsersService } from '@/modules/users/users.service';

import { AuthErrorCode } from './auth.enum';
import { JwtPayload } from './strategies/access-token.strategy';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';

interface AuthUser {
  id: string;
  role: Role;
  name: string;
  email: string;
  avatar: string | null;
}

interface PasswordResetPayload {
  sub: string;
  purpose: 'reset-password';
}

interface EmailVerificationPayload {
  sub: string;
  purpose: 'verify-email';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);

    if (existing) {
      throw new ConflictException({
        code: AuthErrorCode.EMAIL_ALREADY_IN_USE,
        message: 'Email is already in use',
      });
    }

    const hashedPassword = await argon2.hash(dto.password);

    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
    });

    await this.sendVerificationEmail(user.id, user.email);

    return {
      message:
        'Registration successful. Please check your email to verify your account.',
    };
  }

  async registerAdmin(dto: CreateAdminDto) {
    const existing = await this.usersService.findByEmail(dto.email);

    if (existing) {
      throw new ConflictException({
        code: AuthErrorCode.EMAIL_ALREADY_IN_USE,
        message: 'Email is already in use',
      });
    }

    const hashedPassword = await argon2.hash(dto.password);

    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
    });

    const verifiedUser = await this.usersService.update(user.id, {
      emailVerified: true,
    });

    const adminUser = await this.usersService.updateRole(
      verifiedUser.id,
      Role.ADMIN,
    );

    return {
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      role: adminUser.role,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || !user.password) {
      throw new UnauthorizedException({
        code: AuthErrorCode.INVALID_CREDENTIALS,
        message: 'Invalid email or password',
      });
    }

    const isPasswordValid = await argon2.verify(user.password, dto.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: AuthErrorCode.INVALID_CREDENTIALS,
        message: 'Invalid email or password',
      });
    }

    if (user.bannedAt) {
      throw new UnauthorizedException({
        code: AuthErrorCode.ACCOUNT_BANNED,
        message: 'This account has been banned',
      });
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException({
        code: AuthErrorCode.EMAIL_NOT_VERIFIED,
        message: 'Please verify your email before logging in',
      });
    }

    return this.issueTokens(user);
  }

  async validateGoogleUser(googleUser: {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
  }) {
    let user = await this.usersService.findByEmail(googleUser.email);

    if (!user) {
      user = await this.usersService.create({
        name: googleUser.name,
        email: googleUser.email,
        googleId: googleUser.googleId,
        avatar: googleUser.avatar,
        provider: 'GOOGLE',
        password: null,
      });

      user = await this.usersService.update(user.id, {
        emailVerified: true,
      });
    } else if (!user.googleId) {
      user = await this.usersService.update(user.id, {
        googleId: googleUser.googleId,
        avatar: user.avatar ?? googleUser.avatar,
        emailVerified: true,
      });
    }

    return this.issueTokens(user);
  }

  async refresh(
    userId: string,
    refreshToken: string,
    sessionId?: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException({
        code: AuthErrorCode.REFRESH_TOKEN_INVALID,
        message: 'Invalid refresh token',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      await this.lockUserForSessionChange(tx, userId);
      const now = new Date();
      const storedTokens = await tx.refreshToken.findMany({
        where: {
          userId,
          revoked: false,
          expiresAt: { gt: now },
          ...(sessionId ? { sessionId } : {}),
        },
      });

      const matched = await this.findMatchingToken(storedTokens, refreshToken);
      if (!matched) {
        throw new UnauthorizedException({
          code: AuthErrorCode.REFRESH_TOKEN_INVALID,
          message: 'Refresh token is invalid or has expired',
        });
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          name: true,
          email: true,
          avatar: true,
          bannedAt: true,
        },
      });
      if (!user) {
        throw new UnauthorizedException({
          code: AuthErrorCode.USER_NOT_FOUND,
          message: 'User not found',
        });
      }
      if (user.bannedAt) {
        throw new UnauthorizedException({
          code: AuthErrorCode.ACCOUNT_BANNED,
          message: 'This account has been banned',
        });
      }

      const consumed = await tx.refreshToken.updateMany({
        where: { id: matched.id, revoked: false, expiresAt: { gt: now } },
        data: { revoked: true },
      });
      if (consumed.count !== 1) {
        throw new UnauthorizedException({
          code: AuthErrorCode.REFRESH_TOKEN_INVALID,
          message: 'Refresh token has already been used',
        });
      }

      return this.issueTokens(user, matched.sessionId, tx);
    });
  }

  async logout(userId: string, refreshToken: string, sessionId?: string) {
    await this.prisma.$transaction(async (tx) => {
      const lockedUsers = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM users WHERE id = ${userId} FOR UPDATE
      `;
      if (lockedUsers.length === 0) return;

      let targetSessionId = sessionId;
      if (!targetSessionId) {
        // Compatibility for refresh tokens issued before session ids existed.
        const tokens = await tx.refreshToken.findMany({ where: { userId } });
        const matched = await this.findMatchingToken(tokens, refreshToken);
        targetSessionId = matched?.sessionId;
      }

      if (targetSessionId) {
        await tx.refreshToken.updateMany({
          where: { userId, sessionId: targetSessionId, revoked: false },
          data: { revoked: true },
        });
      }
    });

    return { message: 'Logged out successfully' };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    let payload: EmailVerificationPayload;

    try {
      payload = this.jwtService.verify<EmailVerificationPayload>(dto.token, {
        secret: this.config.getOrThrow('jwt.emailVerificationSecret', {
          infer: true,
        }),
      });
    } catch {
      throw new UnauthorizedException({
        code: AuthErrorCode.VERIFICATION_LINK_INVALID,
        message: 'Verification link is invalid or has expired',
      });
    }

    if (payload.purpose !== 'verify-email') {
      throw new UnauthorizedException({
        code: AuthErrorCode.VERIFICATION_LINK_INVALID,
        message: 'Verification link is invalid or has expired',
      });
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException({
        code: AuthErrorCode.VERIFICATION_LINK_INVALID,
        message: 'Verification link is invalid or has expired',
      });
    }

    if (user.emailVerified) {
      return this.issueTokens(user);
    }

    const verifiedUser = await this.usersService.update(user.id, {
      emailVerified: true,
    });

    return this.issueTokens(verifiedUser);
  }

  async resendVerificationEmail(dto: ResendVerificationDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || user.emailVerified) {
      return {
        message:
          'If an account with that email exists and is unverified, a new verification link has been sent.',
      };
    }

    await this.sendVerificationEmail(user.id, user.email);

    return {
      message:
        'If an account with that email exists and is unverified, a new verification link has been sent.',
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || !user.password) {
      return {
        message:
          'If an account with that email exists, a reset link has been sent.',
      };
    }

    const payload: PasswordResetPayload = {
      sub: user.id,
      purpose: 'reset-password',
    };

    const resetToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow('jwt.passwordResetSecret', {
        infer: true,
      }),
      expiresIn: this.config.getOrThrow('jwt.passwordResetExpiresIn', {
        infer: true,
      }),
    });

    const resetUrl = `${this.config.getOrThrow('frontendUrl', {
      infer: true,
    })}/auth/reset-password?token=${resetToken}`;

    await this.mailService.sendResetPasswordEmail(user.email, resetUrl);

    return {
      message:
        'If an account with that email exists, a reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    let payload: PasswordResetPayload;

    try {
      payload = this.jwtService.verify<PasswordResetPayload>(dto.token, {
        secret: this.config.getOrThrow('jwt.passwordResetSecret', {
          infer: true,
        }),
      });
    } catch {
      throw new UnauthorizedException({
        code: AuthErrorCode.RESET_LINK_INVALID,
        message: 'Reset link is invalid or has expired',
      });
    }

    if (payload.purpose !== 'reset-password') {
      throw new UnauthorizedException({
        code: AuthErrorCode.RESET_LINK_INVALID,
        message: 'Reset link is invalid or has expired',
      });
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException({
        code: AuthErrorCode.RESET_LINK_INVALID,
        message: 'Reset link is invalid or has expired',
      });
    }

    if (!user.password) {
      throw new BadRequestException({
        code: AuthErrorCode.NO_PASSWORD_SET,
        message:
          'This account does not have a password set. Please use Google sign-in.',
      });
    }

    const isSamePassword = await argon2.verify(user.password, dto.password);

    if (isSamePassword) {
      throw new BadRequestException({
        code: AuthErrorCode.SAME_PASSWORD,
        message: 'New password must be different from the current password',
      });
    }

    const hashedPassword = await argon2.hash(dto.password);

    await this.usersService.update(user.id, {
      password: hashedPassword,
    });

    await this.prisma.refreshToken.updateMany({
      where: {
        userId: user.id,
        revoked: false,
      },
      data: {
        revoked: true,
      },
    });

    return {
      message: 'Password has been reset successfully',
    };
  }

  private async sendVerificationEmail(userId: string, email: string) {
    const payload: EmailVerificationPayload = {
      sub: userId,
      purpose: 'verify-email',
    };

    const verifyToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow('jwt.emailVerificationSecret', {
        infer: true,
      }),
      expiresIn: this.config.getOrThrow('jwt.emailVerificationExpiresIn', {
        infer: true,
      }),
    });

    const verifyUrl = `${this.config.getOrThrow('frontendUrl', {
      infer: true,
    })}/auth/verify-email?token=${verifyToken}`;

    await this.mailService.sendVerificationEmail(email, verifyUrl);
  }

  private async findMatchingToken(
    tokens: {
      id: string;
      userId: string;
      tokenHash: string;
      sessionId: string;
    }[],
    rawToken: string,
  ) {
    for (const token of tokens) {
      const isMatch = await argon2.verify(token.tokenHash, rawToken);
      if (isMatch) {
        return token;
      }
    }
    return null;
  }

  private async lockUserForSessionChange(
    tx: Prisma.TransactionClient,
    userId: string,
  ) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM users WHERE id = ${userId} FOR UPDATE
    `;
    if (rows.length === 0) {
      throw new UnauthorizedException({
        code: AuthErrorCode.USER_NOT_FOUND,
        message: 'User not found',
      });
    }
  }

  private async issueTokens(
    user: AuthUser,
    sessionId: string = randomUUID(),
    tx?: Prisma.TransactionClient,
  ) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sid: sessionId,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow('jwt.accessSecret', { infer: true }),
      expiresIn: this.config.getOrThrow('jwt.accessExpiresIn', { infer: true }),
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow('jwt.refreshSecret', { infer: true }),
      expiresIn: this.config.getOrThrow('jwt.refreshExpiresIn', { infer: true }),
    });

    const tokenHash = await argon2.hash(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await (tx ?? this.prisma).refreshToken.create({
      data: { userId: user.id, sessionId, tokenHash, expiresAt },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        email: user.email,
        avatar: user.avatar,
      },
    };
  }

}
