import {
  ApiBody,
  ApiParam,
  ApiConsumes,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

import {
  ReviewRatingSummaryDto,
  PaginatedReviewsResponseDto,
} from './dto/paginated-reviews-response.dto';
import { ReviewResponseDto } from './dto/review-response.dto';

export const ApiListReviews = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'List reviews' }),
    ApiOkResponse({ type: PaginatedReviewsResponseDto }),
  );

export const ApiCreateReview = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Create a review' }),
    ApiOkResponse({ type: ReviewResponseDto }),
  );

export const ApiGetReviewById = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get a review by id' }),
    ApiParam({ name: 'id' }),
    ApiOkResponse({ type: ReviewResponseDto }),
  );

export const ApiUpdateReview = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Update a review' }),
    ApiParam({ name: 'id' }),
    ApiOkResponse({ type: ReviewResponseDto }),
  );

export const ApiDeleteReview = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Delete a review' }),
    ApiParam({ name: 'id' }),
  );

export const ApiAddReviewImages = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Add images to a review' }),
    ApiParam({ name: 'id' }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            items: { type: 'string', format: 'binary' },
          },
        },
      },
    }),
    ApiOkResponse({ type: ReviewResponseDto }),
  );

export const ApiRemoveReviewImage = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Remove an image from a review' }),
    ApiParam({ name: 'id' }),
    ApiParam({ name: 'imageId' }),
    ApiOkResponse({ type: ReviewResponseDto }),
  );

export const ApiListPublicReviews = () =>
  applyDecorators(
    ApiOperation({ summary: 'List public reviews for a product' }),
    ApiParam({ name: 'slug' }),
    ApiOkResponse({ type: PaginatedReviewsResponseDto }),
  );

export const ApiGetReviewRatingSummary = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get the rating summary for a product' }),
    ApiParam({ name: 'slug' }),
    ApiOkResponse({ type: ReviewRatingSummaryDto }),
  );

export const ApiCreateCustomerReview = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Customer submits a review for a product' }),
    ApiParam({ name: 'slug' }),
    ApiOkResponse({ type: ReviewResponseDto }),
  );

export const ApiToggleReviewHelpful = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Toggle "helpful" vote on a review' }),
    ApiParam({ name: 'slug' }),
    ApiParam({ name: 'reviewId' }),
    ApiOkResponse({ type: ReviewResponseDto }),
  );
