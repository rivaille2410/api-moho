import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(4000),
  FRONTEND_URL: Joi.string().required(),

  DATABASE_URL: Joi.string().required(),
  DIRECT_URL: Joi.string().required(),

  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  JWT_PASSWORD_RESET_SECRET: Joi.string().min(16).required(),
  JWT_PASSWORD_RESET_EXPIRES_IN: Joi.string().default('15m'),

  JWT_EMAIL_VERIFICATION_SECRET: Joi.string().min(16).required(),
  JWT_EMAIL_VERIFICATION_EXPIRES_IN: Joi.string().default('24h'),

  RESEND_API_KEY: Joi.string().required(),
  MAIL_FROM: Joi.string().default('onboarding@resend.dev'),
});
