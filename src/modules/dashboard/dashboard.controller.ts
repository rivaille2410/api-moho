import { Role } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import {
  ApiGetLowStock,
  ApiGetTopProducts,
  ApiGetRecentOrders,
  ApiGetTopCustomers,
  ApiGetRevenueChart,
  ApiGetDashboardStats,
  ApiGetActiveVouchers,
  ApiGetOrderStatusDistribution,
} from './dashboard.swagger';
import {
  LowStockQueryDto,
  TopProductsQueryDto,
  RecentOrdersQueryDto,
  TopCustomersQueryDto,
  RevenueChartQueryDto,
  DashboardStatsQueryDto,
} from './dto/dashboard-query.dto';
import { DashboardService } from './dashboard.service';
import { Roles } from '@/modules/auth/decorators/roles.decorator';

import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiGetDashboardStats()
  getStats(@Query() query: DashboardStatsQueryDto) {
    return this.dashboardService.getStats(query.range);
  }

  @Get('revenue-chart')
  @ApiGetRevenueChart()
  getRevenueChart(@Query() query: RevenueChartQueryDto) {
    return this.dashboardService.getRevenueChart(query.range);
  }

  @Get('top-products')
  @ApiGetTopProducts()
  getTopProducts(@Query() query: TopProductsQueryDto) {
    return this.dashboardService.getTopProducts(query.limit);
  }

  @Get('low-stock')
  @ApiGetLowStock()
  getLowStock(@Query() query: LowStockQueryDto) {
    return this.dashboardService.getLowStock(query.threshold, query.limit);
  }

  @Get('active-vouchers')
  @ApiGetActiveVouchers()
  getActiveVouchers() {
    return this.dashboardService.getActiveVouchers();
  }

  @Get('order-status-distribution')
  @ApiGetOrderStatusDistribution()
  getOrderStatusDistribution(@Query() query: DashboardStatsQueryDto) {
    return this.dashboardService.getOrderStatusDistribution(query.range);
  }

  @Get('recent-orders')
  @ApiGetRecentOrders()
  getRecentOrders(@Query() query: RecentOrdersQueryDto) {
    return this.dashboardService.getRecentOrders(query.limit);
  }

  @Get('top-customers')
  @ApiGetTopCustomers()
  getTopCustomers(@Query() query: TopCustomersQueryDto) {
    return this.dashboardService.getTopCustomers(query.range, query.limit);
  }
}
