import {
  ApiResponse,
  ApiProduces,
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

import { VoucherResponseDto } from './dto/voucher-response.dto';
import { VoucherValidationResultDto } from './dto/voucher-validation-result.dto';
import { PaginatedVouchersResponseDto } from './dto/paginated-vouchers-response.dto';

export function ApiListVouchers() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'List vouchers',
      description:
        'Retrieve a paginated list of vouchers. Requires admin role.',
    }),
    ApiOkResponse({ type: PaginatedVouchersResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
  );
}

export function ApiCreateVoucher() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Create voucher',
      description: 'Create a new voucher. Requires admin role.',
    }),
    ApiCreatedResponse({ type: VoucherResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiBadRequestResponse({ description: 'Validation failed' }),
    ApiConflictResponse({ description: 'Voucher code is already in use' }),
  );
}

export function ApiExportVouchers() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Export vouchers to Excel',
      description:
        'Export the filtered list of vouchers (search/status) to an .xlsx file. Requires admin role. Not limited by pagination — returns all matching records, capped at 20,000 rows.',
    }),
    ApiProduces(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ),
    ApiResponse({
      status: 200,
      description: 'Excel file (.xlsx) containing the filtered voucher list',
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Export exceeds the maximum allowed row count',
    }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
  );
}

export function ApiGetVoucherById() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get voucher by id',
      description: 'Retrieve a single voucher by id. Requires admin role.',
    }),
    ApiOkResponse({ type: VoucherResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiNotFoundResponse({ description: 'Voucher not found' }),
  );
}

export function ApiUpdateVoucher() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Update voucher',
      description: 'Update voucher information. Requires admin role.',
    }),
    ApiOkResponse({ type: VoucherResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiBadRequestResponse({ description: 'Validation failed' }),
    ApiConflictResponse({ description: 'Voucher code is already in use' }),
    ApiNotFoundResponse({ description: 'Voucher not found' }),
  );
}

export function ApiUpdateVoucherStatus() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Update voucher status',
      description:
        'Change a voucher status between DRAFT, ACTIVE and PAUSED. Requires admin role.',
    }),
    ApiOkResponse({ type: VoucherResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiNotFoundResponse({ description: 'Voucher not found' }),
  );
}

export function ApiDeleteVoucher() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Delete voucher',
      description: 'Soft-delete a voucher. Requires admin role.',
    }),
    ApiNoContentResponse({ description: 'Voucher deleted successfully' }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiNotFoundResponse({ description: 'Voucher not found' }),
  );
}

export const ApiBulkDeleteVouchers = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Bulk delete vouchers',
      description:
        'Soft-deletes multiple vouchers at once. Fails entirely if any ID is invalid or not found.',
    }),
    ApiResponse({
      status: 200,
      description: 'Vouchers deleted successfully.',
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
      description: 'One or more voucher IDs not found.',
    }),
  );

export function ApiValidateVoucher() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Validate voucher for checkout',
      description:
        'Validates a voucher code against the current cart and returns the calculated discount amount. Requires authentication.',
    }),
    ApiOkResponse({ type: VoucherValidationResultDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiNotFoundResponse({ description: 'Voucher code does not exist' }),
    ApiBadRequestResponse({
      description:
        'Voucher is not active, expired, depleted, minimum order value not met, or not applicable to items in cart',
    }),
  );
}
