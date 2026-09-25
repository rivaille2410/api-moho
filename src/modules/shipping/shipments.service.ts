import {
  Logger,
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  Prisma,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  ShipmentStatus,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { OrdersService } from '@/modules/orders/orders.service';

import {
  SHIPMENT_INCLUDE,
  SYNCABLE_ORDER_STATUSES,
  SHIPPABLE_ORDER_INCLUDE,
  SHIPPABLE_ORDER_STATUSES,
  ACTIVE_SHIPMENT_STATUSES,
  SHIPMENT_STATUS_TRANSITIONS,
} from './shipping.constants';
import { buildPaginationMeta } from './shipping.utils';
import { QueryShipmentsDto } from './dto/query-shipments.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { QueryShippableOrdersDto } from './dto/query-shippable-orders.dto';

type Tx = Prisma.TransactionClient;
type ShipmentItemInput = { orderItemId: string; quantity: number };
type OrderStatusChange = { orderId: string; previousStatus: OrderStatus };

const CODE_MAX_ATTEMPTS = 3;

@Injectable()
export class ShipmentsService {
  private readonly logger = new Logger(ShipmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {}

  async findById(id: string) {
    return this.prisma.shipment.findUnique({
      where: { id },
      include: SHIPMENT_INCLUDE,
    });
  }

  async findByIdOrThrow(id: string) {
    const shipment = await this.findById(id);
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }
    return shipment;
  }

  async findAll(query: QueryShipmentsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where = this.buildWhere(query);

    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.shipment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: SHIPMENT_INCLUDE,
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(page, limit, totalItems) };
  }

  async findShippableOrders(query: QueryShippableOrdersDto) {
    const limit = query.limit ?? 20;
    const search = query.search?.trim();
    const like = search ? `%${search.replace(/[\\%_]/g, '\\$&')}%` : null;

    const orderStatuses = Prisma.join(
      SHIPPABLE_ORDER_STATUSES.map((s) => Prisma.sql`${s}::"OrderStatus"`),
    );
    const shipmentStatuses = Prisma.join(
      ACTIVE_SHIPMENT_STATUSES.map((s) => Prisma.sql`${s}::"ShipmentStatus"`),
    );

    const rows = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT o.id
      FROM orders o
      WHERE o.status IN (${orderStatuses})
        ${
          like
            ? Prisma.sql`AND (
                o."orderNumber" ILIKE ${like}
                OR o."recipientName" ILIKE ${like}
                OR o."recipientPhone" ILIKE ${like}
              )`
            : Prisma.empty
        }
        AND EXISTS (
          SELECT 1
          FROM order_items oi
          WHERE oi."orderId" = o.id
            AND oi.quantity > COALESCE((
              SELECT SUM(si.quantity)
              FROM shipment_items si
              JOIN shipments s ON s.id = si."shipmentId"
              WHERE si."orderItemId" = oi.id
                AND s.status IN (${shipmentStatuses})
            ), 0)
        )
      ORDER BY o."createdAt" DESC
      LIMIT ${limit}
    `);

    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const orders = await this.prisma.order.findMany({
      where: { id: { in: ids } },
      include: SHIPPABLE_ORDER_INCLUDE,
    });
    const byId = new Map(orders.map((o) => [o.id, o]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  }

  async create(dto: CreateShipmentDto, createdById?: string) {
    for (let attempt = 1; attempt <= CODE_MAX_ATTEMPTS; attempt++) {
      try {
        return await this.createOnce(dto, createdById);
      } catch (error) {
        const isCodeCollision =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002';
        if (!isCodeCollision || attempt === CODE_MAX_ATTEMPTS) {
          throw error;
        }
      }
    }

    throw new BadRequestException('Unable to generate shipment code');
  }

  private createOnce(dto: CreateShipmentDto, createdById?: string) {
    const { orderId, items: requestedItems, ...info } = dto;

    return this.prisma.$transaction(async (tx) => {
      const orderStatus = await this.lockOrder(tx, orderId);
      if (!orderStatus) {
        throw new NotFoundException('Order not found');
      }
      if (!SHIPPABLE_ORDER_STATUSES.includes(orderStatus)) {
        throw new BadRequestException({
          code: 'ORDER_NOT_SHIPPABLE',
          message: `Cannot create a shipment for an order in status ${orderStatus}`,
        });
      }

      const orderItems = await tx.orderItem.findMany({
        where: { orderId },
        select: { id: true, quantity: true },
      });
      const remaining = await this.getRemainingQuantities(
        tx,
        orderId,
        orderItems,
      );
      const items = this.resolveShipmentItems(requestedItems, remaining);

      return tx.shipment.create({
        data: {
          ...info,
          orderId,
          code: this.generateCode(),
          createdById,
          items: {
            create: items.map((item) => ({
              orderItemId: item.orderItemId,
              quantity: item.quantity,
            })),
          },
        },
        include: SHIPMENT_INCLUDE,
      });
    });
  }

  async update(id: string, dto: UpdateShipmentDto) {
    const shipment = await this.findByIdOrThrow(id);

    if (
      shipment.status === ShipmentStatus.DELIVERED ||
      shipment.status === ShipmentStatus.CANCELLED
    ) {
      throw new BadRequestException({
        code: 'SHIPMENT_LOCKED',
        message: `A ${shipment.status} shipment can no longer be edited`,
      });
    }

    await this.prisma.shipment.update({ where: { id }, data: dto });
    return this.findByIdOrThrow(id);
  }

  async updateStatus(
    id: string,
    dto: UpdateShipmentStatusDto,
    adminId?: string,
  ) {
    const shipment = await this.findByIdOrThrow(id);

    if (!SHIPMENT_STATUS_TRANSITIONS[shipment.status].includes(dto.status)) {
      throw new BadRequestException({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot change shipment status from ${shipment.status} to ${dto.status}`,
      });
    }
    if (dto.status === ShipmentStatus.FAILED && !dto.failedReason?.trim()) {
      throw new BadRequestException({
        code: 'FAILED_REASON_REQUIRED',
        message: 'failedReason is required when marking a shipment as FAILED',
      });
    }
    if (
      dto.collectedAmount !== undefined &&
      dto.status !== ShipmentStatus.DELIVERED
    ) {
      throw new BadRequestException({
        code: 'COLLECTED_AMOUNT_NOT_ALLOWED',
        message: 'collectedAmount can only be sent together with DELIVERED',
      });
    }

    const now = new Date();
    const data: Prisma.ShipmentUncheckedUpdateManyInput = {
      status: dto.status,
    };

    switch (dto.status) {
      case ShipmentStatus.IN_TRANSIT:
        data.shippedAt = now;
        data.failedReason = null;
        break;
      case ShipmentStatus.DELIVERED:
        data.deliveredAt = dto.deliveredAt ?? now;
        break;
      case ShipmentStatus.FAILED:
        data.failedReason = dto.failedReason;
        break;
      default:
        break;
    }

    const change = await this.prisma.$transaction(async (tx) => {
      const orderStatus = await this.lockOrder(tx, shipment.orderId);
      if (!orderStatus) {
        throw new NotFoundException('Order not found');
      }
      if (
        dto.status === ShipmentStatus.IN_TRANSIT &&
        !SHIPPABLE_ORDER_STATUSES.includes(orderStatus)
      ) {
        throw new BadRequestException({
          code: 'ORDER_NOT_SHIPPABLE',
          message: `Order is in status ${orderStatus}, its shipments cannot be dispatched`,
        });
      }

      const claimed = await tx.shipment.updateMany({
        where: { id, status: shipment.status },
        data,
      });
      if (claimed.count === 0) {
        throw new ConflictException({
          code: 'SHIPMENT_STATUS_CHANGED',
          message: 'Shipment status was changed by someone else, please reload',
        });
      }

      if (dto.status === ShipmentStatus.DELIVERED) {
        await this.recordCodCollection(tx, shipment, dto, adminId);
      }

      return this.syncOrderStatus(tx, shipment.orderId);
    });

    if (change) {
      try {
        await this.ordersService.emitStatusChanged(
          change.orderId,
          change.previousStatus,
        );
      } catch (error) {
        this.logger.error('Failed to emit order status change event', error);
      }
    }

    return this.findByIdOrThrow(id);
  }

  private buildWhere(query: QueryShipmentsDto): Prisma.ShipmentWhereInput {
    const { search, status, orderId, scheduledFrom, scheduledTo } = query;
    const contains = (value: string) => ({
      contains: value,
      mode: Prisma.QueryMode.insensitive,
    });

    return {
      ...(status && { status }),
      ...(orderId && { orderId }),
      ...((scheduledFrom || scheduledTo) && {
        scheduledAt: {
          ...(scheduledFrom && { gte: scheduledFrom }),
          ...(scheduledTo && { lte: scheduledTo }),
        },
      }),
      ...(search && {
        OR: [
          { code: contains(search) },
          { trackingCode: contains(search) },
          { driverName: contains(search) },
          { order: { orderNumber: contains(search) } },
          { order: { recipientName: contains(search) } },
          { order: { recipientPhone: contains(search) } },
        ],
      }),
    };
  }

  private async lockOrder(
    tx: Tx,
    orderId: string,
  ): Promise<OrderStatus | null> {
    const rows = await tx.$queryRaw<{ status: OrderStatus }[]>`
      SELECT status FROM orders WHERE id = ${orderId} FOR UPDATE
    `;
    return rows[0]?.status ?? null;
  }

  private async getRemainingQuantities(
    tx: Tx,
    orderId: string,
    orderItems: { id: string; quantity: number }[],
  ) {
    const assigned = await tx.shipmentItem.groupBy({
      by: ['orderItemId'],
      where: {
        orderItem: { orderId },
        shipment: { status: { in: ACTIVE_SHIPMENT_STATUSES } },
      },
      _sum: { quantity: true },
    });

    const assignedMap = new Map(
      assigned.map((row) => [row.orderItemId, row._sum.quantity ?? 0]),
    );

    return new Map(
      orderItems.map((item) => [
        item.id,
        item.quantity - (assignedMap.get(item.id) ?? 0),
      ]),
    );
  }

  private resolveShipmentItems(
    requested: ShipmentItemInput[] | undefined,
    remaining: Map<string, number>,
  ): ShipmentItemInput[] {
    const items: ShipmentItemInput[] = requested?.length
      ? requested
      : [...remaining.entries()]
          .filter(([, quantity]) => quantity > 0)
          .map(([orderItemId, quantity]) => ({ orderItemId, quantity }));

    if (items.length === 0) {
      throw new BadRequestException({
        code: 'NOTHING_TO_SHIP',
        message: 'Every item of this order is already assigned to a shipment',
      });
    }

    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(item.orderItemId)) {
        throw new BadRequestException({
          code: 'DUPLICATE_ORDER_ITEMS',
          message: `Order item ${item.orderItemId} appears more than once`,
        });
      }
      seen.add(item.orderItemId);

      const left = remaining.get(item.orderItemId);
      if (left === undefined) {
        throw new BadRequestException({
          code: 'ORDER_ITEM_NOT_IN_ORDER',
          message: `Order item ${item.orderItemId} does not belong to this order`,
        });
      }
      if (item.quantity > left) {
        throw new BadRequestException({
          code: 'QUANTITY_EXCEEDS_REMAINING',
          message: `Order item ${item.orderItemId} has only ${left} unit(s) left to ship`,
        });
      }
    }

    return items;
  }

  private async recordCodCollection(
    tx: Tx,
    shipment: { orderId: string; driverName: string | null },
    dto: UpdateShipmentStatusDto,
    adminId?: string,
  ) {
    if (dto.collectedAmount === undefined) return;

    const payment = await tx.payment.findFirst({
      where: { orderId: shipment.orderId, method: PaymentMethod.COD },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      throw new BadRequestException({
        code: 'COD_PAYMENT_NOT_FOUND',
        message: 'This order has no COD payment to record a collection for',
      });
    }
    if (payment.status === PaymentStatus.CONFIRMED) {
      throw new BadRequestException({
        code: 'COD_ALREADY_COLLECTED',
        message: 'The COD payment of this order is already confirmed',
      });
    }

    const collected =
      Number(payment.collectedAmount ?? 0) + dto.collectedAmount;
    const data: Prisma.PaymentUncheckedUpdateInput = {
      collectedAmount: collected,
      courierName: shipment.driverName ?? payment.courierName,
    };

    if (collected >= Number(payment.amount)) {
      data.status = PaymentStatus.CONFIRMED;
      data.confirmedAt = new Date();
      if (adminId) data.confirmedById = adminId;
    }

    await tx.payment.update({ where: { id: payment.id }, data });
  }

  private async syncOrderStatus(
    tx: Tx,
    orderId: string,
  ): Promise<OrderStatusChange | null> {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: { select: { id: true, quantity: true } },
        shipments: {
          where: {
            status: {
              in: [ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELIVERED],
            },
          },
          include: { items: true },
        },
      },
    });

    if (!order || !SYNCABLE_ORDER_STATUSES.includes(order.status)) return null;

    const deliveredQty = new Map<string, number>();
    for (const shipment of order.shipments) {
      if (shipment.status !== ShipmentStatus.DELIVERED) continue;
      for (const item of shipment.items) {
        deliveredQty.set(
          item.orderItemId,
          (deliveredQty.get(item.orderItemId) ?? 0) + item.quantity,
        );
      }
    }

    const allDelivered =
      order.items.length > 0 &&
      order.items.every((i) => (deliveredQty.get(i.id) ?? 0) >= i.quantity);

    let next: OrderStatus | null = null;
    if (allDelivered) {
      next = OrderStatus.DELIVERED;
    } else if (
      order.shipments.length > 0 &&
      order.status !== OrderStatus.SHIPPED
    ) {
      next = OrderStatus.SHIPPED;
    }

    if (!next || next === order.status) return null;

    await tx.order.update({ where: { id: orderId }, data: { status: next } });
    return { orderId, previousStatus: order.status };
  }

  private generateCode() {
    const d = new Date();
    const ymd = [
      String(d.getFullYear()).slice(2),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('');
    return `SHP-${ymd}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }
}
