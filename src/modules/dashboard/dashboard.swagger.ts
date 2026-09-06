import {
  ApiQuery,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

import {
  TopProductDto,
  RecentOrderDto,
  TopCustomerDto,
  ActiveVoucherDto,
  LowStockVariantDto,
  RevenueChartPointDto,
  DashboardStatsResponseDto,
  OrderStatusDistributionResponseDto,
} from './dto/dashboard-response.dto';

export const ApiGetDashboardStats = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get dashboard KPI stats',
      description:
        'Returns revenue, new orders, new customers and pending orders for the given range, each compared against the previous period of equal length.',
    }),
    ApiQuery({ name: 'range', required: false, enum: ['7d', '30d', '90d'] }),
    ApiOkResponse({ type: DashboardStatsResponseDto }),
  );

export const ApiGetRevenueChart = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get daily revenue/orders chart data' }),
    ApiQuery({ name: 'range', required: false, enum: ['7d', '30d', '90d'] }),
    ApiOkResponse({ type: RevenueChartPointDto, isArray: true }),
  );

export const ApiGetTopProducts = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get top selling products by soldCount' }),
    ApiQuery({ name: 'limit', required: false, type: Number }),
    ApiOkResponse({ type: TopProductDto, isArray: true }),
  );

export const ApiGetLowStock = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get product variants running low on stock',
      description:
        'Only includes variants of ACTIVE, non-deleted products, sorted ascending by stock.',
    }),
    ApiQuery({ name: 'threshold', required: false, type: Number }),
    ApiQuery({ name: 'limit', required: false, type: Number }),
    ApiOkResponse({ type: LowStockVariantDto, isArray: true }),
  );

export const ApiGetActiveVouchers = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get active vouchers ranked by usage' }),
    ApiOkResponse({ type: ActiveVoucherDto, isArray: true }),
  );

export const ApiGetOrderStatusDistribution = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get order status distribution',
      description:
        'Returns the count and percentage of orders per status within the given range, plus the overall cancellation rate.',
    }),
    ApiQuery({ name: 'range', required: false, enum: ['7d', '30d', '90d'] }),
    ApiOkResponse({ type: OrderStatusDistributionResponseDto }),
  );

export const ApiGetRecentOrders = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get most recent orders with customer info' }),
    ApiQuery({ name: 'limit', required: false, type: Number }),
    ApiOkResponse({ type: RecentOrderDto, isArray: true }),
  );

export const ApiGetTopCustomers = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get top spending customers within a range',
    }),
    ApiQuery({ name: 'range', required: false, enum: ['7d', '30d', '90d'] }),
    ApiQuery({ name: 'limit', required: false, type: Number }),
    ApiOkResponse({ type: TopCustomerDto, isArray: true }),
  );
