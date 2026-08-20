import {
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

import { CategoryResponseDto } from './dto/category-response.dto';
import { CategoryTreeNodeDto } from './dto/category-tree-node.dto';

export function ApiListCategories() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'List categories',
      description: 'Retrieve a flat list of categories with optional filters.',
    }),
    ApiOkResponse({ type: [CategoryResponseDto] }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
  );
}

export function ApiGetCategoryTree() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get category tree',
      description:
        'Retrieve categories as a nested tree, useful for dropdowns and navigation menus.',
    }),
    ApiOkResponse({ type: [CategoryTreeNodeDto] }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
  );
}

export function ApiGetCategoryById() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get category by id' }),
    ApiOkResponse({ type: CategoryResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiNotFoundResponse({ description: 'Category not found' }),
  );
}

export function ApiCreateCategory() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Create category',
      description:
        'Create a new category, optionally nested under a parent category.',
    }),
    ApiCreatedResponse({ type: CategoryResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiBadRequestResponse({ description: 'Validation failed' }),
    ApiNotFoundResponse({ description: 'Parent category not found' }),
    ApiConflictResponse({
      description: 'A category with a similar name already exists',
    }),
  );
}

export function ApiUpdateCategory() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Update category',
      description:
        'Update category information. Rejects moving a category under itself or one of its own descendants.',
    }),
    ApiOkResponse({ type: CategoryResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiBadRequestResponse({
      description: 'Validation failed, or invalid/circular parent reference',
    }),
    ApiNotFoundResponse({
      description: 'Category or parent category not found',
    }),
    ApiConflictResponse({
      description: 'A category with a similar name already exists',
    }),
  );
}

export function ApiDeleteCategory() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Delete category',
      description:
        'Soft-delete a category. Fails if the category still has subcategories or products.',
    }),
    ApiNoContentResponse({ description: 'Category deleted successfully' }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiBadRequestResponse({
      description: 'Category still has subcategories or products',
    }),
    ApiNotFoundResponse({ description: 'Category not found' }),
  );
}
