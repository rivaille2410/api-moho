import { Prisma, PurchaseOrderStatus, StockMovementType } from '@prisma/client';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { QueryPurchaseOrdersDto } from './dto/query-purchase-orders.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { UpdatePurchaseOrderStatusDto } from './dto/update-purchase-order-status.dto';

import { PrismaService } from '@/prisma/prisma.service';
import { StockMovementsService } from '@/modules/inventory/stock-movements/stock-movements.service';

const INCLUDE = {
  items: {
    include: {
      variant: {
        select: {
          id: true,
          name: true,
          colorName: true,
          colorHex: true,
          product: { select: { id: true, name: true, sku: true } },
        },
      },
    },
  },
  supplier: { select: { id: true, name: true } },
  warehouse: { select: { id: true, name: true } },
} satisfies Prisma.PurchaseOrderInclude;

const ALLOWED_STATUS_TRANSITIONS: Record<
  PurchaseOrderStatus,
  PurchaseOrderStatus[]
> = {
  DRAFT: [PurchaseOrderStatus.ORDERED, PurchaseOrderStatus.CANCELLED],
  ORDERED: [PurchaseOrderStatus.CANCELLED],
  PARTIALLY_RECEIVED: [],
  RECEIVED: [],
  CANCELLED: [],
};

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  async findById(id: string) {
    return this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: INCLUDE,
    });
  }

  async findByIdOrThrow(id: string) {
    const po = await this.findById(id);
    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }
    return po;
  }

  async findAll(query: QueryPurchaseOrdersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where = this.buildWhere(query);

    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.findMany({
        where,
        include: INCLUDE,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return this.paginate(data, totalItems, page, limit);
  }

  async create(dto: CreatePurchaseOrderDto, createdById?: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, deletedAt: null },
    });
    if (!supplier) {
      throw new BadRequestException('Supplier not found');
    }

    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, deletedAt: null },
    });
    if (!warehouse) {
      throw new BadRequestException('Warehouse not found');
    }

    const variantIds = dto.items.map((item) => item.variantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
    });
    if (variants.length !== new Set(variantIds).size) {
      throw new BadRequestException(
        'One or more product variants were not found',
      );
    }

    const code = await this.generateCode();

    return this.prisma.purchaseOrder.create({
      data: {
        code,
        supplierId: dto.supplierId,
        warehouseId: dto.warehouseId,
        note: dto.note,
        expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : undefined,
        createdById,
        items: {
          create: dto.items.map((item) => ({
            variantId: item.variantId,
            quantityOrdered: item.quantityOrdered,
            unitCost: item.unitCost,
          })),
        },
      },
      include: INCLUDE,
    });
  }

  async updateStatus(id: string, dto: UpdatePurchaseOrderStatusDto) {
    const po = await this.findByIdOrThrow(id);

    if (!ALLOWED_STATUS_TRANSITIONS[po.status].includes(dto.status)) {
      throw new BadRequestException({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot transition purchase order from ${po.status} to ${dto.status}`,
      });
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: dto.status },
      include: INCLUDE,
    });
  }

  async receive(
    id: string,
    dto: ReceivePurchaseOrderDto,
    createdById?: string,
  ) {
    const po = await this.findByIdOrThrow(id);

    if (
      po.status !== PurchaseOrderStatus.ORDERED &&
      po.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED
    ) {
      throw new BadRequestException({
        code: 'PURCHASE_ORDER_NOT_RECEIVABLE',
        message: `Purchase order must be ORDERED or PARTIALLY_RECEIVED to receive stock (current: ${po.status})`,
      });
    }

    const itemsById = new Map(po.items.map((item) => [item.id, item]));

    for (const receiveItem of dto.items) {
      const poItem = itemsById.get(receiveItem.purchaseOrderItemId);
      if (!poItem) {
        throw new BadRequestException(
          `Purchase order item ${receiveItem.purchaseOrderItemId} does not belong to this purchase order`,
        );
      }
      const remaining = poItem.quantityOrdered - poItem.quantityReceived;
      if (receiveItem.quantity > remaining) {
        throw new BadRequestException(
          `Cannot receive ${receiveItem.quantity} for item ${poItem.id}; only ${remaining} remaining`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const receiveItem of dto.items) {
        const poItem = itemsById.get(receiveItem.purchaseOrderItemId)!;

        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { quantityReceived: { increment: receiveItem.quantity } },
        });

        await this.stockMovementsService.recordMovement(tx, {
          variantId: poItem.variantId,
          warehouseId: po.warehouseId,
          type: StockMovementType.PURCHASE_IN,
          delta: receiveItem.quantity,
          referenceType: 'PurchaseOrder',
          referenceId: po.id,
          createdById,
        });
      }

      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: po.id },
      });

      const allReceived = updatedItems.every(
        (item) => item.quantityReceived >= item.quantityOrdered,
      );
      const anyReceived = updatedItems.some(
        (item) => item.quantityReceived > 0,
      );

      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
          status: allReceived
            ? PurchaseOrderStatus.RECEIVED
            : anyReceived
              ? PurchaseOrderStatus.PARTIALLY_RECEIVED
              : po.status,
          receivedAt: allReceived ? new Date() : po.receivedAt,
        },
      });
    });

    return this.findByIdOrThrow(id);
  }

  // NOTE: count-based sequence. Fine for low-concurrency admin usage; if two
  // requests can race, switch to a DB sequence or a unique-constraint retry
  // loop (same pattern as generateUniqueSlug in PostsService).
  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PO-${year}-`;

    const count = await this.prisma.purchaseOrder.count({
      where: { code: { startsWith: prefix } },
    });

    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  private paginate<T>(
    data: T[],
    totalItems: number,
    page: number,
    limit: number,
  ) {
    const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;
    return {
      data,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  private buildWhere(
    query: QueryPurchaseOrdersDto,
  ): Prisma.PurchaseOrderWhereInput {
    const { supplierId, warehouseId, status, search } = query;

    const trimmedSearch = search?.trim();

    return {
      ...(supplierId && { supplierId }),
      ...(warehouseId && { warehouseId }),
      ...(status && { status }),

      ...(trimmedSearch && {
        OR: [
          {
            code: {
              contains: trimmedSearch,
              mode: 'insensitive',
            },
          },
          {
            supplier: {
              name: {
                contains: trimmedSearch,
                mode: 'insensitive',
              },
            },
          },
          {
            warehouse: {
              name: {
                contains: trimmedSearch,
                mode: 'insensitive',
              },
            },
          },
        ],
      }),
    };
  }
}
