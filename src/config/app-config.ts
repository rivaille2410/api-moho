export type AppConfig = {
  nodeEnv: string;
  port: number;
  frontendUrl: string;
  databaseUrl: string;
  directUrl: string;
  jwt: {
    accessSecret: string;
    accessExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
    passwordResetSecret: string;
    passwordResetExpiresIn: string;
    emailVerificationSecret: string;
    emailVerificationExpiresIn: string;
  };
  mail: {
    resendApiKey: string;
    from: string;
  };
  cloudinary: {
    cloudName?: string;
    apiKey?: string;
    apiSecret?: string;
  };
  google: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
};
