import {
  ApiResponse,
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

import { SupplierResponseDto } from './dto/supplier-response.dto';
import { PaginatedSuppliersResponseDto } from './dto/paginated-suppliers-response.dto';

export function ApiListSuppliers() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'List suppliers',
      description:
        'Retrieve a paginated list of suppliers. Requires admin role.',
    }),
    ApiOkResponse({ type: PaginatedSuppliersResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
  );
}

export function ApiCreateSupplier() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Create supplier',
      description: 'Create a new supplier. Requires admin role.',
    }),
    ApiCreatedResponse({ type: SupplierResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiBadRequestResponse({ description: 'Validation failed' }),
  );
}

export function ApiGetSupplierById() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get supplier by id',
      description: 'Retrieve a single supplier by id. Requires admin role.',
    }),
    ApiOkResponse({ type: SupplierResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiNotFoundResponse({ description: 'Supplier not found' }),
  );
}

export function ApiUpdateSupplier() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Update supplier',
      description: 'Update supplier information. Requires admin role.',
    }),
    ApiOkResponse({ type: SupplierResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiBadRequestResponse({ description: 'Validation failed' }),
    ApiNotFoundResponse({ description: 'Supplier not found' }),
  );
}

export function ApiDeleteSupplier() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Delete supplier',
      description:
        'Soft-delete a supplier. Fails if the supplier has open purchase orders. Requires admin role.',
    }),
    ApiNoContentResponse({ description: 'Supplier deleted successfully' }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiBadRequestResponse({ description: 'Supplier has open purchase orders' }),
    ApiNotFoundResponse({ description: 'Supplier not found' }),
  );
}

export const ApiBulkDeleteSuppliers = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Bulk delete suppliers',
      description:
        'Soft-deletes multiple suppliers at once. Fails entirely if any ID is invalid, not found, or has open purchase orders.',
    }),
    ApiResponse({
      status: 200,
      description: 'Suppliers deleted successfully.',
      schema: { example: { deletedCount: 3 } },
    }),
    ApiResponse({
      status: 400,
      description:
        'Validation failed (empty/invalid ID list, or a supplier has open purchase orders).',
    }),
    ApiResponse({
      status: 403,
      description: 'Only admins can access this resource.',
    }),
    ApiResponse({
      status: 404,
      description: 'One or more supplier IDs not found.',
    }),
  );
