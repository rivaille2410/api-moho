import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, OrderStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

import { ReviewsService } from '../reviews/reviews.service';

import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { OrderWithItems } from './dto/order-response.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

const ORDER_INCLUDE = {
  items: true,
  user: { select: { id: true, name: true, avatar: true } },
} satisfies Prisma.OrderInclude;

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  PROCESSING: [OrderStatus.SHIPPED],
  SHIPPED: [OrderStatus.DELIVERED],
  DELIVERED: [],
  CANCELLED: [],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewsService: ReviewsService,
  ) {}

  async findAll(query: QueryOrdersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where = this.buildWhere(query);

    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: ORDER_INCLUDE,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: data as OrderWithItems[],
      meta: this.buildMeta(page, limit, totalItems),
    };
  }

  async findByIdOrThrow(id: string): Promise<OrderWithItems> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async findAllForUser(userId: string, query: QueryOrdersDto) {
    const { data, meta } = await this.findAll({ ...query, userId });
    const withFlags = await this.attachReviewFlags(data, userId);
    return { data: withFlags, meta };
  }

  async findByIdForUser(id: string, userId: string): Promise<OrderWithItems> {
    const order = await this.findByIdOrThrow(id);
    if (order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }
    const [withFlags] = await this.attachReviewFlags([order], userId);
    return withFlags;
  }

  private async attachReviewFlags(
    orders: OrderWithItems[],
    userId: string,
  ): Promise<OrderWithItems[]> {
    const productIds = orders.flatMap((o) => o.items.map((i) => i.productId));
    const reviewedSet = await this.reviewsService.getReviewedProductIds(
      userId,
      productIds,
    );

    return orders.map((order) => ({
      ...order,
      items: order.items.map((item) => ({
        ...item,
        isReviewed: reviewedSet.has(item.productId),
      })),
    }));
  }

  async create(userId: string, dto: CreateOrderDto): Promise<OrderWithItems> {
    const mergedItems = this.mergeDuplicateItems(dto.items);

    return this.prisma.$transaction(async (tx) => {
      const variants = await tx.productVariant.findMany({
        where: { id: { in: mergedItems.map((i) => i.variantId) } },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              status: true,
              price: true,
              deletedAt: true,
              images: {
                where: { isThumbnail: true, variantId: null },
                take: 1,
                select: { url: true },
              },
            },
          },
          images: {
            where: { isThumbnail: true },
            take: 1,
            select: { url: true },
          },
        },
      });

      const variantsById = new Map(variants.map((v) => [v.id, v]));
      let subtotal = new Prisma.Decimal(0);
      const itemsToCreate: Prisma.OrderItemCreateManyOrderInput[] = [];

      for (const line of mergedItems) {
        const variant = variantsById.get(line.variantId);
        if (!variant || variant.productId !== line.productId) {
          throw new NotFoundException(
            `Variant ${line.variantId} not found on product ${line.productId}`,
          );
        }
        if (variant.product.deletedAt || variant.product.status !== 'ACTIVE') {
          throw new ConflictException({
            code: 'PRODUCT_UNAVAILABLE',
            message: `Product "${variant.product.name}" is no longer available`,
          });
        }

        const decremented = await tx.productVariant.updateMany({
          where: { id: variant.id, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        });
        if (decremented.count === 0) {
          throw new ConflictException({
            code: 'OUT_OF_STOCK',
            message: `Not enough stock for "${variant.product.name} - ${variant.name}"`,
          });
        }

        const unitPrice = variant.priceOverride ?? variant.product.price;
        subtotal = subtotal.add(unitPrice.mul(line.quantity));

        const thumbnailUrl =
          variant.images[0]?.url ?? variant.product.images[0]?.url ?? null;

        itemsToCreate.push({
          productId: variant.productId,
          variantId: variant.id,
          productName: variant.product.name,
          variantName: variant.name,
          thumbnailUrl,
          price: unitPrice,
          quantity: line.quantity,
        });
      }

      await tx.product.updateMany({
        where: { id: { in: itemsToCreate.map((i) => i.productId) } },
        data: { soldCount: { increment: 1 } },
      });

      const orderNumber = await this.generateOrderNumber(tx);

      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          recipientName: dto.recipientName,
          recipientPhone: dto.recipientPhone,
          shippingAddress: dto.shippingAddress,
          note: dto.note,
          paymentMethod: dto.paymentMethod ?? 'COD',
          subtotal,
          shippingFee: new Prisma.Decimal(0),
          discount: new Prisma.Decimal(0),
          total: subtotal,
          items: { createMany: { data: itemsToCreate } },
        },
        include: ORDER_INCLUDE,
      });

      return order;
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
  ): Promise<OrderWithItems> {
    const order = await this.findByIdOrThrow(id);
    const allowed = ALLOWED_TRANSITIONS[order.status];

    if (!allowed.includes(dto.status)) {
      throw new ConflictException({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot move order from ${order.status} to ${dto.status}`,
      });
    }

    if (dto.status === OrderStatus.CANCELLED) {
      return this.cancelOrder(order, dto.cancelReason);
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: ORDER_INCLUDE,
    });
  }

  private async cancelOrder(
    order: OrderWithItems,
    cancelReason?: string,
  ): Promise<OrderWithItems> {
    return this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      }
      await tx.product.updateMany({
        where: { id: { in: order.items.map((i) => i.productId) } },
        data: { soldCount: { decrement: 1 } },
      });

      return tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED, cancelReason },
        include: ORDER_INCLUDE,
      });
    });
  }

  private mergeDuplicateItems(items: CreateOrderDto['items']) {
    const map = new Map<
      string,
      { productId: string; variantId: string; quantity: number }
    >();
    for (const item of items) {
      const existing = map.get(item.variantId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        map.set(item.variantId, { ...item });
      }
    }
    return [...map.values()];
  }

  private async generateOrderNumber(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    for (let attempt = 0; attempt < 5; attempt++) {
      const randomPart = Math.floor(100000 + Math.random() * 900000);
      const orderNumber = `ORD-${datePart}-${randomPart}`;
      const existing = await tx.order.findUnique({ where: { orderNumber } });
      if (!existing) {
        return orderNumber;
      }
    }
    throw new BadRequestException(
      'Failed to generate order number, please retry',
    );
  }

  private buildWhere(query: QueryOrdersDto): Prisma.OrderWhereInput {
    const { status, userId, search } = query;
    return {
      ...(status && { status }),
      ...(userId && { userId }),
      ...(search && {
        orderNumber: { contains: search, mode: Prisma.QueryMode.insensitive },
      }),
    };
  }

  private buildMeta(page: number, limit: number, totalItems: number) {
    const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;
    return {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}
