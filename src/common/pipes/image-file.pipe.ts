import { HttpStatus, ParseFilePipeBuilder } from '@nestjs/common';

import {
  IMAGE_MIME_PATTERN,
  MAX_IMAGE_BYTES,
} from '@/common/constants/export.constants';

export function imageFilePipe(fileIsRequired = true) {
  return new ParseFilePipeBuilder()
    .addFileTypeValidator({ fileType: IMAGE_MIME_PATTERN })
    .addMaxSizeValidator({ maxSize: MAX_IMAGE_BYTES })
    .build({
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      fileIsRequired,
    });
}
