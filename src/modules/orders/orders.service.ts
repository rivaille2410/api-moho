import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Prisma,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ShipmentStatus,
  ConfirmationType,
} from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';

import { AppEvent } from '@/common/events/event-names';
import { ReviewsService } from '../reviews/reviews.service';

import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { OrderWithItems } from './dto/order-response.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

import {
  OrderCreatedEvent,
  OrderStatusChangedEvent,
} from '@/common/events/order.events';
import { ProductLowStockEvent } from '@/common/events/product.events';

const ORDER_INCLUDE = {
  items: {
    include: {
      variant: {
        select: {
          colorHex: true,
          colorName: true,
        },
      },
    },
  },
  user: { select: { id: true, name: true, avatar: true, email: true } },
  payments: { orderBy: { createdAt: 'desc' } },
  returnRequests: { select: { status: true } },
} satisfies Prisma.OrderInclude;

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  PROCESSING: [OrderStatus.SHIPPED],
  SHIPPED: [OrderStatus.DELIVERED],
  DELIVERED: [],
  CANCELLED: [],
};

const LOW_STOCK_THRESHOLD = 5;

function resolveConfirmationType(method: PaymentMethod): ConfirmationType {
  switch (method) {
    case PaymentMethod.COD:
      return ConfirmationType.COD_COLLECTION;
    case PaymentMethod.BANK_TRANSFER:
      return ConfirmationType.MANUAL;
    case PaymentMethod.VNPAY:
    case PaymentMethod.MOMO:
    case PaymentMethod.ZALOPAY:
      return ConfirmationType.WEBHOOK;
    default:
      return ConfirmationType.MANUAL;
  }
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewsService: ReviewsService,
    private readonly eventEmitter: EventEmitter2,
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
    const lowStockEvents: ProductLowStockEvent[] = [];

    const order = await this.prisma.$transaction(async (tx) => {
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

        const updatedVariant = await tx.productVariant.findUniqueOrThrow({
          where: { id: variant.id },
          select: { stock: true },
        });
        if (updatedVariant.stock <= LOW_STOCK_THRESHOLD) {
          lowStockEvents.push(
            new ProductLowStockEvent(
              variant.id,
              variant.name,
              variant.productId,
              variant.product.name,
              updatedVariant.stock,
            ),
          );
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
      const paymentMethod = dto.paymentMethod ?? PaymentMethod.COD;

      return tx.order.create({
        data: {
          orderNumber,
          userId,
          recipientName: dto.recipientName,
          recipientPhone: dto.recipientPhone,
          shippingAddress: dto.shippingAddress,
          note: dto.note,
          subtotal,
          shippingFee: new Prisma.Decimal(0),
          discount: new Prisma.Decimal(0),
          total: subtotal,
          items: { createMany: { data: itemsToCreate } },
          payments: {
            create: {
              method: paymentMethod,
              confirmationType: resolveConfirmationType(paymentMethod),
              amount: subtotal,
            },
          },
        },
        include: ORDER_INCLUDE,
      });
    });

    // Emit only after the transaction has committed successfully.
    this.eventEmitter.emit(
      AppEvent.ORDER_CREATED,
      new OrderCreatedEvent(order),
    );
    for (const event of lowStockEvents) {
      this.eventEmitter.emit(AppEvent.PRODUCT_LOW_STOCK, event);
    }

    return order;
  }

  async exportToExcel(query: QueryOrdersDto): Promise<Buffer> {
    const where = this.buildWhere(query);

    const MAX_EXPORT_ROWS = 20000;
    const totalItems = await this.prisma.order.count({ where });
    if (totalItems > MAX_EXPORT_ROWS) {
      throw new BadRequestException({
        code: 'EXPORT_TOO_LARGE',
        message: `Export exceeds ${MAX_EXPORT_ROWS} rows. Please narrow your filters.`,
      });
    }

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Orders');

    sheet.columns = [
      { header: 'Mã đơn', key: 'orderNumber', width: 22 },
      { header: 'Người đặt', key: 'recipientName', width: 25 },
      { header: 'Số điện thoại', key: 'recipientPhone', width: 15 },
      { header: 'Số sản phẩm', key: 'itemCount', width: 12 },
      { header: 'Tạm tính', key: 'subtotal', width: 15 },
      { header: 'Giảm giá', key: 'discount', width: 15 },
      { header: 'Tổng tiền', key: 'total', width: 15 },
      { header: 'Thanh toán', key: 'paymentMethod', width: 18 },
      { header: 'Trạng thái TT', key: 'paymentStatus', width: 15 },
      { header: 'Trạng thái đơn', key: 'status', width: 15 },
      { header: 'Ngày đặt', key: 'createdAt', width: 20 },
    ];
    sheet.getRow(1).font = { bold: true };

    const statusLabel: Record<OrderStatus, string> = {
      PENDING: 'Chờ xác nhận',
      CONFIRMED: 'Đã xác nhận',
      PROCESSING: 'Đang xử lý',
      SHIPPED: 'Đang giao',
      DELIVERED: 'Đã giao',
      CANCELLED: 'Đã huỷ',
    };

    const paymentLabel: Record<PaymentMethod, string> = {
      COD: 'Thanh toán khi nhận hàng',
      BANK_TRANSFER: 'Chuyển khoản',
      VNPAY: 'VNPay',
      MOMO: 'MoMo',
      ZALOPAY: 'ZaloPay',
    };

    const paymentStatusLabel: Record<PaymentStatus, string> = {
      PENDING: 'Chờ thanh toán',
      AWAITING_CONFIRM: 'Chờ xác nhận',
      CONFIRMED: 'Đã thanh toán',
      FAILED: 'Thất bại',
      REFUNDED: 'Đã hoàn tiền',
      PARTIALLY_REFUNDED: 'Hoàn tiền một phần',
    };

    orders.forEach((order) => {
      const payment = order.payments[0];
      sheet.addRow({
        orderNumber: order.orderNumber,
        recipientName: order.recipientName,
        recipientPhone: order.recipientPhone,
        itemCount: order.items.length,
        subtotal: order.subtotal.toString(),
        discount: order.discount.toString(),
        total: order.total.toString(),
        paymentMethod: payment
          ? (paymentLabel[payment.method] ?? payment.method)
          : '',
        paymentStatus: payment ? paymentStatusLabel[payment.status] : '',
        status: statusLabel[order.status],
        createdAt: order.createdAt.toLocaleDateString('vi-VN'),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto, adminId: string) {
    if (
      dto.status === OrderStatus.SHIPPED ||
      dto.status === OrderStatus.DELIVERED
    ) {
      throw new ConflictException({
        code: 'USE_SHIPMENT_TO_UPDATE',
        message:
          'Shipping progress is driven by shipments. Create a shipment and update its status instead',
      });
    }

    const order = await this.findByIdOrThrow(id);
    const allowed = ALLOWED_TRANSITIONS[order.status];
    const previousStatus = order.status;

    if (!allowed.includes(dto.status)) {
      throw new ConflictException({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot move order from ${order.status} to ${dto.status}`,
      });
    }

    const updated =
      dto.status === OrderStatus.CANCELLED
        ? await this.cancelOrder(order, dto.cancelReason)
        : await this.confirmAndUpdateStatus(order, dto.status, adminId);

    this.eventEmitter.emit(
      AppEvent.ORDER_STATUS_CHANGED,
      new OrderStatusChangedEvent(updated, previousStatus),
    );

    return updated;
  }

  private async confirmAndUpdateStatus(
    order: OrderWithItems,
    newStatus: OrderStatus,
    adminId: string,
  ): Promise<OrderWithItems> {
    return this.prisma.$transaction(async (tx) => {
      const latestPayment = order.payments[0];

      if (
        latestPayment &&
        latestPayment.confirmationType === ConfirmationType.MANUAL &&
        latestPayment.status !== PaymentStatus.CONFIRMED &&
        (newStatus === OrderStatus.CONFIRMED ||
          newStatus === OrderStatus.PROCESSING)
      ) {
        await tx.payment.update({
          where: { id: latestPayment.id },
          data: {
            status: PaymentStatus.CONFIRMED,
            confirmedById: adminId,
            confirmedAt: new Date(),
          },
        });
      }

      return tx.order.update({
        where: { id: order.id },
        data: { status: newStatus },
        include: ORDER_INCLUDE,
      });
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

      const latestPayment = order.payments[0];
      if (latestPayment) {
        if (latestPayment.status === PaymentStatus.CONFIRMED) {
          await tx.payment.update({
            where: { id: latestPayment.id },
            data: { status: PaymentStatus.REFUNDED },
          });
        } else if (
          latestPayment.status === PaymentStatus.PENDING ||
          latestPayment.status === PaymentStatus.AWAITING_CONFIRM
        ) {
          await tx.payment.update({
            where: { id: latestPayment.id },
            data: { status: PaymentStatus.FAILED },
          });
        }
      }

      await tx.shipment.updateMany({
        where: {
          orderId: order.id,
          status: { in: [ShipmentStatus.PREPARING, ShipmentStatus.FAILED] },
        },
        data: { status: ShipmentStatus.CANCELLED },
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

  async emitStatusChanged(orderId: string, previousStatus: OrderStatus) {
    const order = await this.findByIdOrThrow(orderId);
    this.eventEmitter.emit(
      AppEvent.ORDER_STATUS_CHANGED,
      new OrderStatusChangedEvent(order, previousStatus),
    );
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
    const { status, userId, search, paymentStatus } = query;
    return {
      ...(status && { status }),
      ...(userId && { userId }),
      ...(paymentStatus && { payments: { some: { status: paymentStatus } } }),
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
