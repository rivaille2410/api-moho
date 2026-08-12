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

  /**
   * Best-effort extraction of a Cloudinary public_id from a secure_url,
   * e.g. https://res.cloudinary.com/demo/image/upload/v123/avatars/abc.jpg -> avatars/abc
   */
  extractPublicId(url: string): string | null {
    const match = url.match(/\/upload\/(?:v\d+\/)?([^.]+)\.[a-zA-Z0-9]+$/);
    return match ? match[1] : null;
  }
}
