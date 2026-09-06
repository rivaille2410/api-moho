import { VoucherType, OrderStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class MetricWithChangeDto {
  @ApiProperty() value: number;
  @ApiProperty() changePercent: number;
}

class PendingOrdersMetricDto {
  @ApiProperty() value: number;
}

export class DashboardStatsResponseDto {
  @ApiProperty({ enum: ['7d', '30d', '90d'] })
  range: string;

  @ApiProperty({ type: MetricWithChangeDto })
  revenue: MetricWithChangeDto;

  @ApiProperty({ type: MetricWithChangeDto })
  newOrders: MetricWithChangeDto;

  @ApiProperty({ type: MetricWithChangeDto })
  newCustomers: MetricWithChangeDto;

  @ApiProperty({ type: PendingOrdersMetricDto })
  pendingOrders: PendingOrdersMetricDto;
}

export class RevenueChartPointDto {
  @ApiProperty({ example: '2026-08-30' })
  date: string;

  @ApiProperty()
  revenue: number;

  @ApiProperty()
  orders: number;
}

export class TopProductDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() sku: string;
  @ApiProperty() price: number;
  @ApiProperty() soldCount: number;
  @ApiProperty({ nullable: true }) thumbnailUrl: string | null;
}

export class LowStockVariantDto {
  @ApiProperty() variantId: string;
  @ApiProperty() variantName: string;
  @ApiProperty({ nullable: true }) colorName: string | null;
  @ApiProperty() stock: number;
  @ApiProperty() productId: string;
  @ApiProperty() productName: string;
  @ApiProperty() sku: string;
}

export class ActiveVoucherDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: VoucherType }) type: VoucherType;
  @ApiProperty() value: number;
  @ApiProperty() usedCount: number;
  @ApiProperty({ nullable: true }) usageLimit: number | null;
  @ApiProperty() totalDiscountApplied: number;
}

export class OrderStatusDistributionItemDto {
  @ApiProperty({ enum: OrderStatus }) status: OrderStatus;
  @ApiProperty() count: number;
  @ApiProperty() percentage: number;
}

export class OrderStatusDistributionResponseDto {
  @ApiProperty() range: string;
  @ApiProperty() total: number;
  @ApiProperty() cancelledCount: number;
  @ApiProperty() cancellationRate: number;
  @ApiProperty({ type: OrderStatusDistributionItemDto, isArray: true })
  distribution: OrderStatusDistributionItemDto[];
}

export class RecentOrderCustomerDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiPropertyOptional({ nullable: true }) avatar: string | null;
}

export class RecentOrderDto {
  @ApiProperty() id: string;
  @ApiProperty() orderNumber: string;
  @ApiProperty({ enum: OrderStatus }) status: OrderStatus;
  @ApiProperty() total: number;
  @ApiProperty() paymentMethod: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ type: RecentOrderCustomerDto })
  customer: RecentOrderCustomerDto;
}

export class TopCustomerDto {
  @ApiProperty() userId: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiPropertyOptional({ nullable: true }) avatar: string | null;
  @ApiProperty() totalSpent: number;
  @ApiProperty() orderCount: number;
}
