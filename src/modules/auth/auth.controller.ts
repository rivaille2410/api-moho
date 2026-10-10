import {
  Get,
  Res,
  Req,
  Post,
  Body,
  UseGuards,
  Controller,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

import {
  ApiMe,
  ApiLogin,
  ApiLogout,
  ApiRefresh,
  ApiRegister,
  ApiGoogleAuth,
  ApiVerifyEmail,
  ApiResetPassword,
  ApiRegisterAdmin,
  ApiGoogleCallback,
  ApiForgotPassword,
  ApiResendVerification,
} from './auth.swagger';
import { AuthService } from './auth.service';

import { GoogleAuthGuard } from './guards/google-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';

import type { AppConfig } from '@/config/app-config';
import { Admin, Public, CurrentUser } from '@/common/decorators';
import type { CurrentUserPayload } from './interfaces/current-user.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  @Public()
  @Post('register')
  @ApiRegister()
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiBearerAuth()
  @Admin()
  @Post('register-admin')
  @ApiRegisterAdmin()
  registerAdmin(@Body() dto: CreateAdminDto) {
    return this.authService.registerAdmin(dto);
  }

  @Public()
  @Post('login')
  @ApiLogin()
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('verify-email')
  @ApiVerifyEmail()
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Public()
  @Post('resend-verification')
  @ApiResendVerification()
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(dto);
  }

  @Public()
  @Post('forgot-password')
  @ApiForgotPassword()
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @ApiResetPassword()
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiGoogleAuth()
  googleAuth() {}

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiGoogleCallback()
  async googleCallback(
    @Req()
    req: {
      user: {
        googleId: string;
        email: string;
        name: string;
        avatar?: string;
      };
    },
    @Res() res: Response,
  ) {
    const tokens = await this.authService.validateGoogleUser(req.user);

    const frontendUrl = this.config.getOrThrow('frontendUrl', { infer: true });

    res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }

  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @ApiRefresh()
  refresh(
    @Body() _dto: RefreshTokenDto,
    @CurrentUser() user: { id: string; refreshToken: string },
  ) {
    return this.authService.refresh(user.id, user.refreshToken);
  }

  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('logout')
  @ApiLogout()
  logout(
    @Body() _dto: RefreshTokenDto,
    @CurrentUser() user: { id: string; refreshToken: string },
  ) {
    return this.authService.logout(user.id, user.refreshToken);
  }

  @ApiBearerAuth()
  @Post('me')
  @ApiMe()
  me(@CurrentUser() user: CurrentUserPayload) {
    return user;
  }
}
