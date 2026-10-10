import type { AppConfig } from './app-config';

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  frontendUrl: process.env.FRONTEND_URL as string,

  databaseUrl: process.env.DATABASE_URL as string,
  directUrl: process.env.DIRECT_URL as string,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET as string,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET as string,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    passwordResetSecret: process.env.JWT_PASSWORD_RESET_SECRET as string,
    passwordResetExpiresIn: process.env.JWT_PASSWORD_RESET_EXPIRES_IN ?? '15m',
    emailVerificationSecret: process.env
      .JWT_EMAIL_VERIFICATION_SECRET as string,
    emailVerificationExpiresIn:
      process.env.JWT_EMAIL_VERIFICATION_EXPIRES_IN ?? '24h',
  },

  mail: {
    resendApiKey: process.env.RESEND_API_KEY as string,
    from: process.env.MAIL_FROM ?? 'onboarding@resend.dev',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID as string,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL as string,
  },
});
