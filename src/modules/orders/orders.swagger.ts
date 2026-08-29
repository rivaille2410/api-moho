import {
  ApiParam,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
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
