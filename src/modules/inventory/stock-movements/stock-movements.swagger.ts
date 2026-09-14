import {
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

import { StockMovementResponseDto } from './dto/stock-movement-response.dto';
import { PaginatedStockMovementsResponseDto } from './dto/paginated-stock-movements-response.dto';

export function ApiListStockMovements() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'List stock movements',
      description:
        'Retrieve a paginated stock movement ledger, optionally filtered by variant, warehouse or type. Requires admin role.',
    }),
    ApiOkResponse({ type: PaginatedStockMovementsResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({ description: 'Only admins can access this resource' }),
  );
}

export function ApiCreateStockAdjustment() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Create a manual stock adjustment',
      description:
        'Applies a signed delta to a variant\'s stock in a given warehouse (e.g. after a physical count) and records it in the ledger. Requires admin role.',
    }),
    ApiCreatedResponse({ type: StockMovementResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({ description: 'Only admins can access this resource' }),
    ApiBadRequestResponse({
      description: 'Validation failed, delta is zero, or resulting stock would be negative',
    }),
  );
}
