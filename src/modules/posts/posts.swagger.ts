import {
  ApiResponse,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

import { PostResponseDto } from './dto/post-response.dto';
import { PaginatedPostsResponseDto } from './dto/paginated-posts-response.dto';

export function ApiListPosts() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'List posts',
      description: 'Retrieve a paginated list of posts. Requires admin role.',
    }),
    ApiOkResponse({ type: PaginatedPostsResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
  );
}

export function ApiListPublicPosts() {
  return applyDecorators(
    ApiOperation({
      summary: 'List public posts',
      description:
        'Retrieve a paginated list of PUBLISHED posts for storefront use. No authentication required.',
    }),
    ApiOkResponse({ type: PaginatedPostsResponseDto }),
  );
}

export function ApiGetPublicPostBySlug() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get public post by slug',
      description:
        'Retrieve a single PUBLISHED post by its slug for storefront use. Increments view count. No authentication required.',
    }),
    ApiOkResponse({ type: PostResponseDto }),
    ApiNotFoundResponse({ description: 'Post not found' }),
  );
}

export function ApiCreatePost() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Create post',
      description: 'Create a new post. Requires admin role.',
    }),
    ApiCreatedResponse({ type: PostResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiBadRequestResponse({ description: 'Validation failed' }),
    ApiConflictResponse({ description: 'Slug is already in use' }),
  );
}

export function ApiGetPostById() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get post by id',
      description: 'Retrieve a single post by id. Requires admin role.',
    }),
    ApiOkResponse({ type: PostResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiNotFoundResponse({ description: 'Post not found' }),
  );
}

export function ApiUpdatePost() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Update post',
      description: 'Update post information. Requires admin role.',
    }),
    ApiOkResponse({ type: PostResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiBadRequestResponse({ description: 'Validation failed' }),
    ApiConflictResponse({ description: 'Slug is already in use' }),
    ApiNotFoundResponse({ description: 'Post not found' }),
  );
}

export function ApiUpdatePostStatus() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Update post status',
      description:
        'Change a post status between DRAFT, PUBLISHED and ARCHIVED. Sets publishedAt the first time a post becomes PUBLISHED. Requires admin role.',
    }),
    ApiOkResponse({ type: PostResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiNotFoundResponse({ description: 'Post not found' }),
  );
}

export function ApiDeletePost() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Delete post',
      description: 'Soft-delete a post. Requires admin role.',
    }),
    ApiNoContentResponse({ description: 'Post deleted successfully' }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiNotFoundResponse({ description: 'Post not found' }),
  );
}

export const ApiBulkDeletePosts = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Bulk delete posts',
      description:
        'Soft-deletes multiple posts at once. Fails entirely if any ID is invalid or not found.',
    }),
    ApiResponse({
      status: 200,
      description: 'Posts deleted successfully.',
      schema: { example: { deletedCount: 3 } },
    }),
    ApiResponse({
      status: 400,
      description: 'Validation failed (empty or invalid ID list).',
    }),
    ApiResponse({
      status: 403,
      description: 'Only admins can access this resource.',
    }),
    ApiResponse({
      status: 404,
      description: 'One or more post IDs not found.',
    }),
  );
