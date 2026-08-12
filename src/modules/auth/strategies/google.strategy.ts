import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';

import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.getOrThrow<string>('GOOGLE_CLIENT_ID').trim(),
      clientSecret: config.getOrThrow<string>('GOOGLE_CLIENT_SECRET').trim(),
      callbackURL: config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const { id, name, emails, photos } = profile;

    const googleUser = {
      googleId: id,
      email: emails?.[0]?.value,
      name: `${name?.givenName ?? ''} ${name?.familyName ?? ''}`.trim(),
      avatar: photos?.[0]?.value,
    };

    done(null, googleUser);
  }
}
