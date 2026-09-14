import {
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

import { WarehouseResponseDto } from './dto/warehouse-response.dto';

export function ApiListWarehouses() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'List warehouses',
      description: 'Retrieve all active warehouses. Requires admin role.',
    }),
    ApiOkResponse({ type: [WarehouseResponseDto] }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
  );
}

export function ApiGetWarehouseById() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get warehouse by id',
      description:
        'Retrieve a single warehouse by its id. Requires admin role.',
    }),
    ApiOkResponse({ type: WarehouseResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiNotFoundResponse({ description: 'Warehouse not found' }),
  );
}

export function ApiCreateWarehouse() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Create warehouse',
      description:
        'Create a new warehouse. Setting isMain unsets any previous main warehouse. Requires admin role.',
    }),
    ApiCreatedResponse({ type: WarehouseResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiBadRequestResponse({ description: 'Validation failed' }),
  );
}

export function ApiUpdateWarehouse() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Update warehouse',
      description: 'Update warehouse information. Requires admin role.',
    }),
    ApiOkResponse({ type: WarehouseResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiNotFoundResponse({ description: 'Warehouse not found' }),
  );
}

export function ApiDeleteWarehouse() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Delete warehouse',
      description:
        'Soft-delete a warehouse. Fails for the main warehouse or one with open purchase orders. Requires admin role.',
    }),
    ApiNoContentResponse({ description: 'Warehouse deleted successfully' }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiBadRequestResponse({
      description: 'Warehouse is main or has open purchase orders',
    }),
    ApiNotFoundResponse({ description: 'Warehouse not found' }),
  );
}

export function ApiBulkDeleteWarehouses() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Bulk delete warehouses',
      description:
        'Soft-deletes multiple warehouses at once. Fails entirely if any ID is invalid, not found, is the main warehouse, or has open purchase orders.',
    }),
    ApiOkResponse({
      description: 'Warehouses deleted successfully.',
      schema: { example: { deletedCount: 3 } },
    }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiBadRequestResponse({
      description:
        'Validation failed, or one of the warehouses is the main warehouse or has open purchase orders',
    }),
    ApiNotFoundResponse({ description: 'One or more warehouse IDs not found' }),
  );
}
