import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { BulkDeleteWarehousesDto } from './dto/bulk-delete-warehouses.dto';

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.warehouse.findFirst({ where: { id, deletedAt: null } });
  }

  async findByIdOrThrow(id: string) {
    const warehouse = await this.findById(id);
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }
    return warehouse;
  }

  async findAll() {
    return this.prisma.warehouse.findMany({
      where: { deletedAt: null },
      orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async create(dto: CreateWarehouseDto) {
    if (dto.isMain) {
      await this.prisma.warehouse.updateMany({
        where: { isMain: true, deletedAt: null },
        data: { isMain: false },
      });
    }
    return this.prisma.warehouse.create({ data: dto });
  }

  async update(id: string, dto: UpdateWarehouseDto) {
    await this.findByIdOrThrow(id);

    if (dto.isMain) {
      await this.prisma.warehouse.updateMany({
        where: { isMain: true, deletedAt: null, id: { not: id } },
        data: { isMain: false },
      });
    }

    return this.prisma.warehouse.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const warehouse = await this.findByIdOrThrow(id);

    this.assertNotMain([warehouse]);
    await this.assertNoOpenPurchaseOrders([id]);

    await this.prisma.warehouse.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async bulkRemove(dto: BulkDeleteWarehousesDto) {
    const uniqueIds = Array.from(new Set(dto.ids));

    const warehouses = await this.prisma.warehouse.findMany({
      where: { id: { in: uniqueIds }, deletedAt: null },
    });

    if (warehouses.length !== uniqueIds.length) {
      throw new NotFoundException('One or more warehouse IDs not found');
    }

    this.assertNotMain(warehouses);
    await this.assertNoOpenPurchaseOrders(uniqueIds);

    const { count } = await this.prisma.warehouse.updateMany({
      where: { id: { in: uniqueIds } },
      data: { deletedAt: new Date() },
    });

    return { deletedCount: count };
  }

  private assertNotMain(warehouses: { id: string; isMain: boolean }[]) {
    const mainWarehouse = warehouses.find((w) => w.isMain);
    if (mainWarehouse) {
      throw new BadRequestException({
        code: 'CANNOT_DELETE_MAIN_WAREHOUSE',
        message: 'Set another warehouse as main before deleting this one',
      });
    }
  }

  private async assertNoOpenPurchaseOrders(warehouseIds: string[]) {
    const openPurchaseOrderCount = await this.prisma.purchaseOrder.count({
      where: {
        warehouseId: { in: warehouseIds },
        status: { in: ['DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED'] },
      },
    });

    if (openPurchaseOrderCount > 0) {
      throw new BadRequestException({
        code: 'WAREHOUSE_HAS_OPEN_PURCHASE_ORDERS',
        message: 'Cannot delete a warehouse that has open purchase orders',
      });
    }
  }
}
