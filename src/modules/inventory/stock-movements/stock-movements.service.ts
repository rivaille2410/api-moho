import { PrismaService } from '@/prisma/prisma.service';
import { Prisma, StockMovementType } from '@prisma/client';
import { Injectable, BadRequestException } from '@nestjs/common';

import { QueryStockMovementsDto } from './dto/query-stock-movements.dto';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { StockMovementResponseDto } from './dto/stock-movement-response.dto';

type Tx = Prisma.TransactionClient;

const INBOUND_TYPES: StockMovementType[] = [
  StockMovementType.PURCHASE_IN,
  StockMovementType.RETURN_IN,
  StockMovementType.TRANSFER_IN,
];

const OUTBOUND_TYPES: StockMovementType[] = [
  StockMovementType.SALE_OUT,
  StockMovementType.DAMAGED_OUT,
  StockMovementType.TRANSFER_OUT,
];

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
        include: {
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
        },
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
        quantity: Math.abs(delta),
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
    const movement = await this.prisma.$transaction((tx) =>
      this.recordMovement(tx, {
        variantId: dto.variantId,
        warehouseId: dto.warehouseId,
        type: StockMovementType.ADJUSTMENT,
        delta: dto.delta,
        note: dto.note,
        referenceType: 'Manual',
      }),
    );

    return this.prisma.stockMovement.findUniqueOrThrow({
      where: { id: movement.id },
      include: {
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
      },
    });
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
