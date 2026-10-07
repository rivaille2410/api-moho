import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma, StockMovementType } from '@prisma/client';

import { INBOUND_TYPES, OUTBOUND_TYPES } from './stock-movement.utils';

import { QueryStockMovementsDto } from './dto/query-stock-movements.dto';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { StockMovementResponseDto } from './dto/stock-movement-response.dto';

type Tx = Prisma.TransactionClient;

const DEFAULT_VARIANT_NAME = 'Default';

const MOVEMENT_INCLUDE = {
  variant: {
    include: {
      product: {
        include: {
          images: { where: { isThumbnail: true }, take: 1 },
        },
      },
      images: { take: 1, orderBy: { sortOrder: 'asc' } },
    },
  },
  warehouse: true,
} satisfies Prisma.StockMovementInclude;

@Injectable()
export class StockMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryStockMovementsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhere(query);

    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: MOVEMENT_INCLUDE,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return this.paginate(
      data.map((movement) => new StockMovementResponseDto(movement)),
      totalItems,
      page,
      limit,
    );
  }

  async recordMovement(
    tx: Tx,
    params: {
      variantId: string;
      warehouseId: string;
      type: StockMovementType;
      delta: number;
      referenceType?: string;
      referenceId?: string;
      note?: string;
      createdById?: string;
    },
  ) {
    const {
      variantId,
      warehouseId,
      type,
      delta,
      referenceType,
      referenceId,
      note,
      createdById,
    } = params;

    if (delta === 0) {
      throw new BadRequestException('Stock movement delta cannot be zero');
    }
    if (INBOUND_TYPES.includes(type) && delta < 0) {
      throw new BadRequestException(
        `${type} movements must have a positive delta`,
      );
    }
    if (OUTBOUND_TYPES.includes(type) && delta > 0) {
      throw new BadRequestException(
        `${type} movements must have a negative delta`,
      );
    }

    if (delta < 0) {
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
      });
      if (!variant || variant.stock + delta < 0) {
        throw new BadRequestException({
          code: 'INSUFFICIENT_STOCK',
          message: `Not enough stock for variant ${variantId} to apply this movement`,
        });
      }
    }

    const movement = await tx.stockMovement.create({
      data: {
        variantId,
        warehouseId,
        type,
        quantity:
          type === StockMovementType.ADJUSTMENT ? delta : Math.abs(delta),
        referenceType,
        referenceId,
        note,
        createdById,
      },
    });

    await tx.productVariant.update({
      where: { id: variantId },
      data: { stock: { increment: delta } },
    });

    return movement;
  }

  async createAdjustment(dto: CreateStockAdjustmentDto) {
    const movement = await this.prisma.$transaction(async (tx) => {
      await this.assertWarehouseExists(tx, dto.warehouseId);
      const variantId = await this.resolveVariantId(tx, dto);

      return this.recordMovement(tx, {
        variantId,
        warehouseId: dto.warehouseId,
        type: dto.type ?? StockMovementType.ADJUSTMENT,
        delta: dto.delta,
        note: dto.note,
        referenceType: 'Manual',
      });
    });

    return this.prisma.stockMovement.findUniqueOrThrow({
      where: { id: movement.id },
      include: MOVEMENT_INCLUDE,
    });
  }

  private async assertWarehouseExists(tx: Tx, warehouseId: string) {
    const warehouse = await tx.warehouse.findFirst({
      where: { id: warehouseId, deletedAt: null },
      select: { id: true },
    });

    if (!warehouse) {
      throw new NotFoundException({
        code: 'WAREHOUSE_NOT_FOUND',
        message: `Warehouse ${warehouseId} not found`,
      });
    }
  }

  private async resolveVariantId(
    tx: Tx,
    dto: { variantId?: string; productId?: string },
  ): Promise<string> {
    if (dto.variantId) {
      const variant = await tx.productVariant.findUnique({
        where: { id: dto.variantId },
        select: { id: true },
      });

      if (!variant) {
        throw new NotFoundException({
          code: 'VARIANT_NOT_FOUND',
          message: `Variant ${dto.variantId} not found`,
        });
      }

      return variant.id;
    }

    if (!dto.productId) {
      throw new BadRequestException({
        code: 'VARIANT_OR_PRODUCT_REQUIRED',
        message: 'Either variantId or productId must be provided',
      });
    }

    const product = await tx.product.findFirst({
      where: { id: dto.productId, deletedAt: null },
      select: {
        id: true,
        variants: {
          select: { id: true },
          orderBy: { sortOrder: 'asc' },
          take: 2,
        },
      },
    });

    if (!product) {
      throw new NotFoundException({
        code: 'PRODUCT_NOT_FOUND',
        message: `Product ${dto.productId} not found`,
      });
    }

    if (product.variants.length > 1) {
      throw new BadRequestException({
        code: 'VARIANT_REQUIRED',
        message: 'Product has multiple variants, please specify variantId',
      });
    }

    if (product.variants.length === 1) {
      return product.variants[0].id;
    }

    const defaultVariant = await tx.productVariant.create({
      data: {
        productId: product.id,
        name: DEFAULT_VARIANT_NAME,
        stock: 0,
        sortOrder: 0,
      },
      select: { id: true },
    });

    return defaultVariant.id;
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
    query: QueryStockMovementsDto,
  ): Prisma.StockMovementWhereInput {
    const { variantId, warehouseId, type, search } = query;
    return {
      ...(variantId && { variantId }),
      ...(warehouseId && { warehouseId }),
      ...(type && { type }),
      ...(search && {
        OR: [
          { note: { contains: search, mode: Prisma.QueryMode.insensitive } },
          {
            variant: {
              product: {
                name: { contains: search, mode: Prisma.QueryMode.insensitive },
              },
            },
          },
          {
            warehouse: {
              name: { contains: search, mode: Prisma.QueryMode.insensitive },
            },
          },
        ],
      }),
    };
  }
}
