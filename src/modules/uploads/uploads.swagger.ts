import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

export function ApiUploadImage() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiConsumes('multipart/form-data'),
    ApiOperation({
      summary: 'Upload a standalone image',
      description:
        'Upload a single image not tied to any specific entity (e.g. for embedding in rich text content such as product descriptions). Stored on Cloudinary under the "content" folder. Requires admin role.',
    }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: 'Image file (jpg, jpeg, png, webp), max 5MB',
          },
        },
      },
    }),
    ApiCreatedResponse({
      description: 'Image uploaded successfully',
      schema: {
        properties: {
          url: {
            type: 'string',
            example:
              'https://res.cloudinary.com/demo/image/upload/v1699999999/content/abc123.jpg',
          },
        },
      },
    }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiUnprocessableEntityResponse({
      description: 'Invalid file type or file too large',
    }),
  );
}
