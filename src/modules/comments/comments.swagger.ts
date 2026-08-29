import {
  ApiParam,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

import { CommentResponseDto } from './dto/comment-response.dto';

export const ApiListComments = () =>
  applyDecorators(
    ApiOperation({ summary: 'List top-level comments for a review' }),
    ApiParam({ name: 'slug' }),
    ApiParam({ name: 'reviewId' }),
    ApiOkResponse({ type: CommentResponseDto, isArray: true }),
  );

export const ApiCreateComment = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Add a comment to a review (or reply to a top-level comment)',
    }),
    ApiParam({ name: 'slug' }),
    ApiParam({ name: 'reviewId' }),
    ApiOkResponse({ type: CommentResponseDto }),
  );

export const ApiRemoveComment = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Delete a comment (owner or admin)' }),
    ApiParam({ name: 'slug' }),
    ApiParam({ name: 'reviewId' }),
    ApiParam({ name: 'commentId' }),
  );
