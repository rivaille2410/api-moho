import { Inject, Injectable } from '@nestjs/common';

import type {
  UploadApiResponse,
  v2 as CloudinaryType,
  UploadApiErrorResponse,
} from 'cloudinary';
import { Readable } from 'stream';

import { CLOUDINARY } from './cloudinary.constants';

@Injectable()
export class CloudinaryService {
  constructor(
    @Inject(CLOUDINARY) private readonly cloudinary: typeof CloudinaryType,
  ) {}

  async uploadAvatar(
    file: Express.Multer.File,
    folder = 'avatars',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 512, height: 512, crop: 'fill', gravity: 'face' },
          ],
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error || !result) {
            return reject(error);
          }
          resolve(result);
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  async deleteAsset(publicId: string): Promise<void> {
    await this.cloudinary.uploader.destroy(publicId);
  }

  async uploadProductImage(
    file: Express.Multer.File,
    folder = 'products',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [{ width: 1600, height: 1600, crop: 'limit' }],
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error || !result) {
            return reject(error);
          }
          resolve(result);
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  extractPublicId(url: string): string | null {
    const match = url.match(/\/upload\/(?:v\d+\/)?([^.]+)\.[a-zA-Z0-9]+$/);
    return match ? match[1] : null;
  }
}
