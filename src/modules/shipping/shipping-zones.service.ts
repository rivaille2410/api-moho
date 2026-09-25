import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

import { ZONE_INCLUDE } from './shipping.constants';
import { buildPaginationMeta } from './shipping.utils';
import { QueryShippingZonesDto } from './dto/query-shipping-zones.dto';
import { CreateShippingZoneDto } from './dto/create-shipping-zone.dto';
import { UpdateShippingZoneDto } from './dto/update-shipping-zone.dto';
import { ShippingZoneProvinceDto } from './dto/create-shipping-zone.dto';

@Injectable()
export class ShippingZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.shippingZone.findFirst({
      where: { id, deletedAt: null },
      include: ZONE_INCLUDE,
    });
  }

  async findByIdOrThrow(id: string) {
    const zone = await this.findById(id);
    if (!zone) {
      throw new NotFoundException('Shipping zone not found');
    }
    return zone;
  }

  async findAll(query: QueryShippingZonesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where = this.buildWhere(query);

    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.shippingZone.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: ZONE_INCLUDE,
      }),
      this.prisma.shippingZone.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(page, limit, totalItems) };
  }

  async create(dto: CreateShippingZoneDto) {
    this.assertDaysRange(dto.estimatedDaysMin, dto.estimatedDaysMax);
    await this.assertProvincesAvailable(dto.provinces);

    try {
      return await this.prisma.shippingZone.create({
        data: {
          name: dto.name,
          baseFee: dto.baseFee,
          baseWeight: dto.baseWeight,
          extraFeePerKg: dto.extraFeePerKg,
          freeShipMinOrder: dto.freeShipMinOrder,
          estimatedDaysMin: dto.estimatedDaysMin,
          estimatedDaysMax: dto.estimatedDaysMax,
          isActive: dto.isActive,
          sortOrder: dto.sortOrder,
          provinces: {
            create: dto.provinces.map((p) => ({
              provinceCode: p.provinceCode,
              provinceName: p.provinceName,
            })),
          },
        },
        include: ZONE_INCLUDE,
      });
    } catch (error) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateShippingZoneDto) {
    const existing = await this.findByIdOrThrow(id);

    const { provinces, ...rest } = dto;

    this.assertDaysRange(
      dto.estimatedDaysMin !== undefined
        ? dto.estimatedDaysMin
        : existing.estimatedDaysMin,
      dto.estimatedDaysMax !== undefined
        ? dto.estimatedDaysMax
        : existing.estimatedDaysMax,
    );

    if (provinces) {
      await this.assertProvincesAvailable(provinces, id);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (provinces) {
          await tx.shippingZoneProvince.deleteMany({ where: { zoneId: id } });
          await tx.shippingZoneProvince.createMany({
            data: provinces.map((p) => ({
              zoneId: id,
              provinceCode: p.provinceCode,
              provinceName: p.provinceName,
            })),
          });
        }
        return tx.shippingZone.update({
          where: { id },
          data: rest,
          include: ZONE_INCLUDE,
        });
      });
    } catch (error) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  async remove(id: string) {
    await this.findByIdOrThrow(id);

    await this.prisma.$transaction([
      this.prisma.shippingZoneProvince.deleteMany({ where: { zoneId: id } }),
      this.prisma.shippingZone.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false },
      }),
    ]);
  }

  private buildWhere(
    query: QueryShippingZonesDto,
  ): Prisma.ShippingZoneWhereInput {
    const { search, isActive } = query;

    return {
      deletedAt: null,
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        name: { contains: search, mode: Prisma.QueryMode.insensitive },
      }),
    };
  }

  private assertDaysRange(min?: number | null, max?: number | null) {
    if (min != null && max != null && min > max) {
      throw new BadRequestException({
        code: 'INVALID_ESTIMATED_DAYS',
        message: 'estimatedDaysMin must not be greater than estimatedDaysMax',
      });
    }
  }

  private async assertProvincesAvailable(
    provinces: ShippingZoneProvinceDto[],
    excludeZoneId?: string,
  ) {
    const codes = provinces.map((p) => p.provinceCode);

    if (new Set(codes).size !== codes.length) {
      throw new BadRequestException({
        code: 'DUPLICATE_PROVINCES',
        message: 'The same province appears more than once in this zone',
      });
    }

    const taken = await this.prisma.shippingZoneProvince.findMany({
      where: {
        provinceCode: { in: codes },
        ...(excludeZoneId && { zoneId: { not: excludeZoneId } }),
      },
      include: { zone: { select: { name: true } } },
    });

    if (taken.length > 0) {
      throw new ConflictException({
        code: 'PROVINCE_ALREADY_ASSIGNED',
        message: `These provinces already belong to another zone: ${taken
          .map((t) => `${t.provinceName} (${t.zone.name})`)
          .join(', ')}`,
      });
    }
  }

  private handleUniqueConstraintError(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = (error.meta?.target as string[]) ?? [];

      if (target.includes('provinceCode')) {
        throw new ConflictException({
          code: 'PROVINCE_ALREADY_ASSIGNED',
          message: 'One of the provinces was just assigned to another zone',
        });
      }

      throw new ConflictException({
        code: 'UNIQUE_CONSTRAINT_VIOLATION',
        message: `Field ${target.join(', ')} must be unique`,
      });
    }
  }
}
