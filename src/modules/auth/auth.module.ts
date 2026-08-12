import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MailModule } from '@/modules/mail/mail.module';
import { UsersModule } from '@/modules/users/users.module';

import { GoogleStrategy } from './strategies/google.strategy';
import { AccessTokenStrategy } from './strategies/access-token.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';

@Module({
  imports: [UsersModule, MailModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleStrategy,
    AccessTokenStrategy,
    RefreshTokenStrategy,
  ],
})
export class AuthModule {}
