import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

import { DashboardRange } from './dto/dashboard-query.dto';

const REVENUE_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

const PENDING_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
];

function rangeToDays(range: DashboardRange): number {
  switch (range) {
    case '7d':
      return 7;
    case '90d':
      return 90;
    case '30d':
    default:
      return 30;
  }
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(range: DashboardRange) {
    const days = rangeToDays(range);
    const now = new Date();
    const currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - days);
    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - days);

    const [
      currentRevenueAgg,
      previousRevenueAgg,
      currentOrdersCount,
      previousOrdersCount,
      currentCustomersCount,
      previousCustomersCount,
      pendingOrdersCount,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: {
          status: { in: REVENUE_STATUSES },
          createdAt: { gte: currentStart, lte: now },
        },
      }),
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: {
          status: { in: REVENUE_STATUSES },
          createdAt: { gte: previousStart, lt: currentStart },
        },
      }),
      this.prisma.order.count({
        where: { createdAt: { gte: currentStart, lte: now } },
      }),
      this.prisma.order.count({
        where: { createdAt: { gte: previousStart, lt: currentStart } },
      }),
      this.prisma.user.count({
        where: {
          role: 'CUSTOMER',
          deletedAt: null,
          createdAt: { gte: currentStart, lte: now },
        },
      }),
      this.prisma.user.count({
        where: {
          role: 'CUSTOMER',
          deletedAt: null,
          createdAt: { gte: previousStart, lt: currentStart },
        },
      }),
      this.prisma.order.count({
        where: { status: { in: PENDING_STATUSES } },
      }),
    ]);

    const currentRevenue = Number(currentRevenueAgg._sum.total ?? 0);
    const previousRevenue = Number(previousRevenueAgg._sum.total ?? 0);

    return {
      range,
      revenue: {
        value: currentRevenue,
        changePercent: percentChange(currentRevenue, previousRevenue),
      },
      newOrders: {
        value: currentOrdersCount,
        changePercent: percentChange(currentOrdersCount, previousOrdersCount),
      },
      newCustomers: {
        value: currentCustomersCount,
        changePercent: percentChange(
          currentCustomersCount,
          previousCustomersCount,
        ),
      },
      pendingOrders: {
        value: pendingOrdersCount,
      },
    };
  }

  async getRevenueChart(range: DashboardRange) {
    const days = rangeToDays(range);
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);

    const rows = await this.prisma.$queryRaw<
      {
        date: Date;
        revenue: Prisma.Decimal;
        orders: number;
      }[]
    >`
      SELECT
        date_trunc('day', "createdAt") AS date,
        COALESCE(SUM("total"), 0) AS revenue,
        COUNT(*)::int AS orders
      FROM "orders"
      WHERE "createdAt" >= ${start}
        AND "status" IN ('CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED')
      GROUP BY date_trunc('day', "createdAt")
      ORDER BY date ASC;
    `;

    return rows.map((row) => ({
      date: row.date.toISOString().slice(0, 10),
      revenue: Number(row.revenue),
      orders: row.orders,
    }));
  }

  async getTopProducts(limit: number) {
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { soldCount: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        soldCount: true,
        images: {
          where: { isThumbnail: true },
          take: 1,
          select: { url: true },
        },
      },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: Number(p.price),
      soldCount: p.soldCount,
      thumbnailUrl: p.images[0]?.url ?? null,
    }));
  }

  async getLowStock(threshold: number, limit: number) {
    const variants = await this.prisma.productVariant.findMany({
      where: {
        stock: { lte: threshold },
        product: { deletedAt: null, status: 'ACTIVE' },
      },
      orderBy: { stock: 'asc' },
      take: limit,
      select: {
        id: true,
        name: true,
        colorName: true,
        stock: true,
        product: { select: { id: true, name: true, sku: true } },
      },
    });

    return variants.map((v) => ({
      variantId: v.id,
      variantName: v.name,
      colorName: v.colorName,
      stock: v.stock,
      productId: v.product.id,
      productName: v.product.name,
      sku: v.product.sku,
    }));
  }

  async getActiveVouchers(limit = 10) {
    const vouchers = await this.prisma.voucher.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      orderBy: { usedCount: 'desc' },
      take: limit,
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        value: true,
        usedCount: true,
        usageLimit: true,
        usages: { select: { discountApplied: true } },
      },
    });

    return vouchers.map((v) => ({
      id: v.id,
      code: v.code,
      name: v.name,
      type: v.type,
      value: Number(v.value),
      usedCount: v.usedCount,
      usageLimit: v.usageLimit,
      totalDiscountApplied: v.usages.reduce(
        (sum, u) => sum + Number(u.discountApplied),
        0,
      ),
    }));
  }

  // ===== BỔ SUNG MỚI =====

  /** Phân bố số lượng đơn hàng theo từng trạng thái trong khoảng thời gian, kèm tỉ lệ huỷ đơn. */
  async getOrderStatusDistribution(range: DashboardRange) {
    const days = rangeToDays(range);
    const start = new Date();
    start.setDate(start.getDate() - days);

    const rows = await this.prisma.order.groupBy({
      by: ['status'],
      where: { createdAt: { gte: start } },
      _count: { _all: true },
    });

    const total = rows.reduce((sum, r) => sum + r._count._all, 0);
    const countByStatus = new Map(rows.map((r) => [r.status, r._count._all]));

    const distribution = Object.values(OrderStatus).map((status) => {
      const count = countByStatus.get(status) ?? 0;
      return {
        status,
        count,
        percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
      };
    });

    const cancelledCount = countByStatus.get(OrderStatus.CANCELLED) ?? 0;

    return {
      range,
      total,
      cancelledCount,
      cancellationRate:
        total > 0 ? Number(((cancelledCount / total) * 100).toFixed(1)) : 0,
      distribution,
    };
  }

  /** Danh sách đơn hàng mới nhất kèm thông tin khách hàng. */
  async getRecentOrders(limit: number) {
    const orders = await this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        paymentMethod: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    return orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: Number(o.total),
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt,
      customer: {
        id: o.user.id,
        name: o.user.name,
        email: o.user.email,
        avatar: o.user.avatar,
      },
    }));
  }

  /** Top khách hàng chi tiêu nhiều nhất (dựa trên đơn có trạng thái tính doanh thu) trong khoảng thời gian. */
  async getTopCustomers(range: DashboardRange, limit: number) {
    const days = rangeToDays(range);
    const start = new Date();
    start.setDate(start.getDate() - days);

    const grouped = await this.prisma.order.groupBy({
      by: ['userId'],
      where: {
        status: { in: REVENUE_STATUSES },
        createdAt: { gte: start },
      },
      _sum: { total: true },
      _count: { _all: true },
      orderBy: { _sum: { total: 'desc' } },
      take: limit,
    });

    if (grouped.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { id: { in: grouped.map((g) => g.userId) } },
      select: { id: true, name: true, email: true, avatar: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return grouped.map((g) => {
      const user = userMap.get(g.userId);
      return {
        userId: g.userId,
        name: user?.name ?? 'Khách hàng',
        email: user?.email ?? '',
        avatar: user?.avatar ?? null,
        totalSpent: Number(g._sum.total ?? 0),
        orderCount: g._count._all,
      };
    });
  }
}
