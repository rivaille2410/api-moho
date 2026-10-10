import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { v2 as cloudinary } from 'cloudinary';

import type { AppConfig } from '@/config/app-config';

import { CLOUDINARY } from './cloudinary.constants';
import { CloudinaryService } from './cloudinary.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: CLOUDINARY,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        cloudinary.config({
          cloud_name: config.get('cloudinary.cloudName', { infer: true }),
          api_key: config.get('cloudinary.apiKey', { infer: true }),
          api_secret: config.get('cloudinary.apiSecret', { infer: true }),
        });
        return cloudinary;
      },
    },
    CloudinaryService,
  ],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
