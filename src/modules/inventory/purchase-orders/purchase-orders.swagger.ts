import {
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

import { PurchaseOrderResponseDto } from './dto/purchase-order-response.dto';
import { PaginatedPurchaseOrdersResponseDto } from './dto/paginated-purchase-orders-response.dto';

export function ApiListPurchaseOrders() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'List purchase orders',
      description: 'Retrieve a paginated list of purchase orders. Requires admin role.',
    }),
    ApiOkResponse({ type: PaginatedPurchaseOrdersResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({ description: 'Only admins can access this resource' }),
  );
}

export function ApiCreatePurchaseOrder() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Create purchase order',
      description:
        'Create a new purchase order (status DRAFT) with its line items. Does not affect stock. Requires admin role.',
    }),
    ApiCreatedResponse({ type: PurchaseOrderResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({ description: 'Only admins can access this resource' }),
    ApiBadRequestResponse({ description: 'Validation failed, or supplier/warehouse/variant not found' }),
  );
}

export function ApiGetPurchaseOrderById() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get purchase order by id',
      description: 'Retrieve a single purchase order with its items. Requires admin role.',
    }),
    ApiOkResponse({ type: PurchaseOrderResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({ description: 'Only admins can access this resource' }),
    ApiNotFoundResponse({ description: 'Purchase order not found' }),
  );
}

export function ApiUpdatePurchaseOrderStatus() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Update purchase order status',
      description:
        'Transition a purchase order between DRAFT, ORDERED and CANCELLED. RECEIVED/PARTIALLY_RECEIVED are set automatically by /receive. Requires admin role.',
    }),
    ApiOkResponse({ type: PurchaseOrderResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({ description: 'Only admins can access this resource' }),
    ApiBadRequestResponse({ description: 'Invalid status transition' }),
    ApiNotFoundResponse({ description: 'Purchase order not found' }),
  );
}

export function ApiReceivePurchaseOrder() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Receive stock for a purchase order',
      description:
        'Records incoming stock for one or more line items (full or partial), creates the corresponding stock movements, and updates variant stock levels atomically. Purchase order status becomes PARTIALLY_RECEIVED or RECEIVED depending on outcome. Requires admin role.',
    }),
    ApiOkResponse({ type: PurchaseOrderResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({ description: 'Only admins can access this resource' }),
    ApiBadRequestResponse({
      description: 'Purchase order not receivable, item mismatch, or quantity exceeds what remains',
    }),
    ApiNotFoundResponse({ description: 'Purchase order not found' }),
  );
}
