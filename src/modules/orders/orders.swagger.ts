import {
  ApiParam,
  ApiProduces,
  ApiResponse,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

import { OrderResponseDto } from './dto/order-response.dto';
import { PaginatedOrdersResponseDto } from './dto/paginated-orders-response.dto';

export const ApiListOrders = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'List all orders' }),
    ApiOkResponse({ type: PaginatedOrdersResponseDto }),
  );

export const ApiGetOrderById = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get an order by id' }),
    ApiParam({ name: 'id' }),
    ApiOkResponse({ type: OrderResponseDto }),
  );

export const ApiUpdateOrderStatus = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Update order status' }),
    ApiParam({ name: 'id' }),
    ApiOkResponse({ type: OrderResponseDto }),
  );

export const ApiCreateOrder = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Customer places a new order' }),
    ApiOkResponse({ type: OrderResponseDto }),
  );

export function ApiExportOrders() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Export orders to Excel',
      description:
        'Export the filtered list of orders (search/status) to an .xlsx file. Requires admin role. Not limited by pagination — returns all matching records, capped at 20,000 rows.',
    }),
    ApiProduces(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ),
    ApiResponse({
      status: 200,
      description: 'Excel file (.xlsx) containing the filtered order list',
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

export const ApiListMyOrders = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'List orders of the current user' }),
    ApiOkResponse({ type: PaginatedOrdersResponseDto }),
  );

export const ApiGetMyOrderById = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: "Get one of the current user's orders" }),
    ApiParam({ name: 'id' }),
    ApiOkResponse({ type: OrderResponseDto }),
  );
