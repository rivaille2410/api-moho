import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

import { QuerySuppliersDto } from './dto/query-suppliers.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { BulkDeleteSuppliersDto } from './dto/bulk-delete-suppliers.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.supplier.findFirst({ where: { id, deletedAt: null } });
  }

  async findByIdOrThrow(id: string) {
    const supplier = await this.findById(id);
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
    return supplier;
  }

  async findAll(query: QuerySuppliersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where = this.buildWhere(query);

    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return this.paginate(data, totalItems, page, limit);
  }

  async create(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: dto });
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findByIdOrThrow(id);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findByIdOrThrow(id);
    await this.assertNoOpenPurchaseOrders([id]);

    await this.prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async bulkRemove(dto: BulkDeleteSuppliersDto) {
    const uniqueIds = Array.from(new Set(dto.ids));

    const existingSuppliers = await this.prisma.supplier.findMany({
      where: { id: { in: uniqueIds }, deletedAt: null },
      select: { id: true },
    });

    if (existingSuppliers.length !== uniqueIds.length) {
      throw new NotFoundException('One or more supplier IDs not found');
    }

    await this.assertNoOpenPurchaseOrders(uniqueIds);

    const { count } = await this.prisma.supplier.updateMany({
      where: { id: { in: uniqueIds } },
      data: { deletedAt: new Date() },
    });

    return { deletedCount: count };
  }

  private async assertNoOpenPurchaseOrders(supplierIds: string[]) {
    const openPurchaseOrderCount = await this.prisma.purchaseOrder.count({
      where: {
        supplierId: { in: supplierIds },
        status: { in: ['DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED'] },
      },
    });

    if (openPurchaseOrderCount > 0) {
      throw new BadRequestException({
        code: 'SUPPLIER_HAS_OPEN_PURCHASE_ORDERS',
        message:
          'Cannot delete a supplier that has open (non-completed) purchase orders',
      });
    }
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

  private buildWhere(query: QuerySuppliersDto): Prisma.SupplierWhereInput {
    const { search } = query;
    return {
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { phone: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
        ],
      }),
    };
  }
}
