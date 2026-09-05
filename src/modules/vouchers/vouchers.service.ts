import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Prisma,
  Voucher,
  VoucherType,
  VoucherScope,
  VoucherStatus,
} from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '@/prisma/prisma.service';

import { QueryVouchersDto } from './dto/query-vouchers.dto';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { ValidateVoucherDto } from './dto/validate-voucher.dto';
import { VoucherValidationResultDto } from './dto/voucher-validation-result.dto';

const VOUCHER_INCLUDE = {
  categories: true,
  products: true,
} satisfies Prisma.VoucherInclude;

@Injectable()
export class VouchersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.voucher.findFirst({
      where: { id, deletedAt: null },
      include: VOUCHER_INCLUDE,
    });
  }

  async findByIdOrThrow(id: string) {
    const voucher = await this.findById(id);
    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }
    return voucher;
  }

  async findAll(query: QueryVouchersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where = this.buildWhere(query);

    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.voucher.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.voucher.count({ where }),
    ]);

    return this.paginate(data, totalItems, page, limit);
  }

  async create(dto: CreateVoucherDto) {
    this.assertValidDateRange(dto.startAt, dto.endAt);
    this.assertValidScope(dto.scope, dto.categoryIds, dto.productIds);

    try {
      return await this.prisma.voucher.create({
        data: {
          code: dto.code,
          name: dto.name,
          description: dto.description,
          type: dto.type,
          value: dto.value,
          maxDiscount:
            dto.type === VoucherType.PERCENT ? dto.maxDiscount : null,
          minOrderValue: dto.minOrderValue ?? 0,
          scope: dto.scope,
          usageLimit: dto.usageLimit,
          usageLimitPerUser: dto.usageLimitPerUser ?? 1,
          startAt: new Date(dto.startAt),
          endAt: new Date(dto.endAt),
          status: dto.status ?? VoucherStatus.DRAFT,
          isPublic: dto.isPublic ?? true,
          categories:
            dto.scope === VoucherScope.CATEGORY
              ? {
                  create: dto.categoryIds!.map((categoryId) => ({
                    categoryId,
                  })),
                }
              : undefined,
          products:
            dto.scope === VoucherScope.PRODUCT
              ? { create: dto.productIds!.map((productId) => ({ productId })) }
              : undefined,
        },
        include: VOUCHER_INCLUDE,
      });
    } catch (error) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  async exportToExcel(query: QueryVouchersDto): Promise<Buffer> {
    const where = this.buildWhere(query);

    const MAX_EXPORT_ROWS = 20000;
    const totalItems = await this.prisma.voucher.count({ where });
    if (totalItems > MAX_EXPORT_ROWS) {
      throw new BadRequestException({
        code: 'EXPORT_TOO_LARGE',
        message: `Export exceeds ${MAX_EXPORT_ROWS} rows. Please narrow your filters.`,
      });
    }

    const vouchers = await this.prisma.voucher.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Vouchers');

    sheet.columns = [
      { header: 'Mã voucher', key: 'code', width: 18 },
      { header: 'Tên voucher', key: 'name', width: 28 },
      { header: 'Loại', key: 'type', width: 15 },
      { header: 'Giá trị', key: 'value', width: 15 },
      { header: 'Phạm vi', key: 'scope', width: 15 },
      { header: 'Đã dùng', key: 'usedCount', width: 12 },
      { header: 'Giới hạn', key: 'usageLimit', width: 12 },
      { header: 'Trạng thái', key: 'status', width: 15 },
      { header: 'Bắt đầu', key: 'startAt', width: 20 },
      { header: 'Hết hạn', key: 'endAt', width: 20 },
      { header: 'Ngày tạo', key: 'createdAt', width: 20 },
    ];
    sheet.getRow(1).font = { bold: true };

    const typeLabel: Record<VoucherType, string> = {
      PERCENT: 'Phần trăm (%)',
      FIXED: 'Số tiền cố định',
    };

    const scopeLabel: Record<VoucherScope, string> = {
      ALL: 'Toàn shop',
      CATEGORY: 'Theo danh mục',
      PRODUCT: 'Theo sản phẩm',
    };

    const statusLabel: Record<VoucherStatus, string> = {
      DRAFT: 'Bản nháp',
      ACTIVE: 'Đang chạy',
      PAUSED: 'Tạm dừng',
      EXPIRED: 'Hết hạn',
      DEPLETED: 'Hết lượt',
    };

    vouchers.forEach((voucher) => {
      sheet.addRow({
        code: voucher.code,
        name: voucher.name,
        type: typeLabel[voucher.type],
        value:
          voucher.type === 'PERCENT'
            ? `${voucher.value.toString()}%`
            : voucher.value.toString(),
        scope: scopeLabel[voucher.scope],
        usedCount: voucher.usedCount,
        usageLimit: voucher.usageLimit ?? 'Không giới hạn',
        status: statusLabel[voucher.status],
        startAt: voucher.startAt.toLocaleDateString('vi-VN'),
        endAt: voucher.endAt.toLocaleDateString('vi-VN'),
        createdAt: voucher.createdAt.toLocaleDateString('vi-VN'),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async update(id: string, dto: UpdateVoucherDto) {
    const existing = await this.findByIdOrThrow(id);

    const scope = dto.scope ?? existing.scope;
    if (dto.scope) {
      this.assertValidScope(dto.scope, dto.categoryIds, dto.productIds);
    }
    if (dto.startAt || dto.endAt) {
      this.assertValidDateRange(
        dto.startAt ?? existing.startAt.toISOString(),
        dto.endAt ?? existing.endAt.toISOString(),
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.categoryIds) {
          await tx.voucherCategory.deleteMany({ where: { voucherId: id } });
        }
        if (dto.productIds) {
          await tx.voucherProduct.deleteMany({ where: { voucherId: id } });
        }

        return tx.voucher.update({
          where: { id },
          data: {
            name: dto.name,
            description: dto.description,
            type: dto.type,
            value: dto.value,
            maxDiscount:
              (dto.type ?? existing.type) === VoucherType.PERCENT
                ? dto.maxDiscount
                : null,
            minOrderValue: dto.minOrderValue,
            scope: dto.scope,
            usageLimit: dto.usageLimit,
            usageLimitPerUser: dto.usageLimitPerUser,
            startAt: dto.startAt ? new Date(dto.startAt) : undefined,
            endAt: dto.endAt ? new Date(dto.endAt) : undefined,
            status: dto.status,
            isPublic: dto.isPublic,
            categories:
              dto.categoryIds && scope === VoucherScope.CATEGORY
                ? {
                    create: dto.categoryIds.map((categoryId) => ({
                      categoryId,
                    })),
                  }
                : undefined,
            products:
              dto.productIds && scope === VoucherScope.PRODUCT
                ? { create: dto.productIds.map((productId) => ({ productId })) }
                : undefined,
          },
          include: VOUCHER_INCLUDE,
        });
      });
    } catch (error) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  async updateStatus(id: string, status: VoucherStatus) {
    await this.findByIdOrThrow(id);
    return this.prisma.voucher.update({
      where: { id },
      data: { status },
      include: VOUCHER_INCLUDE,
    });
  }

  async remove(id: string) {
    await this.findByIdOrThrow(id);
    await this.prisma.voucher.update({
      where: { id },
      data: { deletedAt: new Date(), status: VoucherStatus.PAUSED },
    });
  }

  async bulkRemove(ids: string[]) {
    const vouchers = await this.prisma.voucher.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });

    const foundIds = vouchers.map((v) => v.id);
    const notFoundIds = ids.filter((id) => !foundIds.includes(id));

    if (notFoundIds.length > 0) {
      throw new NotFoundException({
        code: 'VOUCHERS_NOT_FOUND',
        message: `The following voucher IDs were not found: ${notFoundIds.join(', ')}`,
      });
    }

    const result = await this.prisma.voucher.updateMany({
      where: { id: { in: foundIds } },
      data: { deletedAt: new Date(), status: VoucherStatus.PAUSED },
    });

    return { deletedCount: result.count };
  }

  async validateForOrder(
    userId: string,
    dto: ValidateVoucherDto,
  ): Promise<VoucherValidationResultDto> {
    const voucher = await this.prisma.voucher.findFirst({
      where: { code: dto.code.trim().toUpperCase(), deletedAt: null },
      include: VOUCHER_INCLUDE,
    });

    if (!voucher) {
      throw new NotFoundException({
        code: 'VOUCHER_NOT_FOUND',
        message: 'Voucher code does not exist',
      });
    }

    const now = new Date();

    if (voucher.status !== VoucherStatus.ACTIVE) {
      throw new BadRequestException({
        code: 'VOUCHER_NOT_ACTIVE',
        message: 'Voucher is not active',
      });
    }

    if (now < voucher.startAt || now > voucher.endAt) {
      throw new BadRequestException({
        code: 'VOUCHER_NOT_IN_DATE_RANGE',
        message: 'Voucher is not valid at this time',
      });
    }

    if (
      voucher.usageLimit !== null &&
      voucher.usedCount >= voucher.usageLimit
    ) {
      throw new BadRequestException({
        code: 'VOUCHER_DEPLETED',
        message: 'Voucher has reached its usage limit',
      });
    }

    const userUsageCount = await this.prisma.voucherUsage.count({
      where: { voucherId: voucher.id, userId },
    });
    if (userUsageCount >= voucher.usageLimitPerUser) {
      throw new BadRequestException({
        code: 'VOUCHER_USER_LIMIT_REACHED',
        message:
          'You have already used this voucher the maximum number of times',
      });
    }

    if (dto.subtotal < Number(voucher.minOrderValue)) {
      throw new BadRequestException({
        code: 'VOUCHER_MIN_ORDER_NOT_MET',
        message: `Order subtotal must be at least ${voucher.minOrderValue} to use this voucher`,
      });
    }

    this.assertScopeApplicable(voucher, dto.categoryIds, dto.productIds);

    const discountAmount = this.calculateDiscount(voucher, dto.subtotal);

    return new VoucherValidationResultDto(
      voucher.id,
      voucher.code,
      discountAmount,
    );
  }

  private calculateDiscount(voucher: Voucher, subtotal: number): number {
    let discount =
      voucher.type === VoucherType.PERCENT
        ? Math.round((subtotal * Number(voucher.value)) / 100)
        : Number(voucher.value);

    if (voucher.type === VoucherType.PERCENT && voucher.maxDiscount) {
      discount = Math.min(discount, Number(voucher.maxDiscount));
    }

    return Math.min(discount, subtotal);
  }

  private assertScopeApplicable(
    voucher: Voucher & {
      categories: { categoryId: string }[];
      products: { productId: string }[];
    },
    categoryIds?: string[],
    productIds?: string[],
  ) {
    if (voucher.scope === VoucherScope.ALL) return;

    if (voucher.scope === VoucherScope.CATEGORY) {
      const allowed = voucher.categories.map((c) => c.categoryId);
      const matched = (categoryIds ?? []).some((id) => allowed.includes(id));
      if (!matched) {
        throw new BadRequestException({
          code: 'VOUCHER_NOT_APPLICABLE',
          message: 'Voucher does not apply to items in your cart',
        });
      }
      return;
    }

    if (voucher.scope === VoucherScope.PRODUCT) {
      const allowed = voucher.products.map((p) => p.productId);
      const matched = (productIds ?? []).some((id) => allowed.includes(id));
      if (!matched) {
        throw new BadRequestException({
          code: 'VOUCHER_NOT_APPLICABLE',
          message: 'Voucher does not apply to items in your cart',
        });
      }
    }
  }

  computeEffectiveStatus(voucher: Voucher): VoucherStatus {
    const now = new Date();
    if (voucher.status === VoucherStatus.DRAFT) return VoucherStatus.DRAFT;
    if (voucher.status === VoucherStatus.PAUSED) return VoucherStatus.PAUSED;
    if (now > voucher.endAt) return VoucherStatus.EXPIRED;
    if (
      voucher.usageLimit !== null &&
      voucher.usedCount >= voucher.usageLimit
    ) {
      return VoucherStatus.DEPLETED;
    }
    if (now < voucher.startAt) return VoucherStatus.DRAFT;
    return VoucherStatus.ACTIVE;
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

  private buildWhere(query: QueryVouchersDto): Prisma.VoucherWhereInput {
    const { search, status, scope } = query;
    return {
      deletedAt: null,
      ...(status && { status }),
      ...(scope && { scope }),
      ...(search && {
        OR: [
          { code: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        ],
      }),
    };
  }

  private assertValidDateRange(startAt: string, endAt: string) {
    if (new Date(startAt) >= new Date(endAt)) {
      throw new BadRequestException({
        code: 'INVALID_DATE_RANGE',
        message: 'startAt must be earlier than endAt',
      });
    }
  }

  private assertValidScope(
    scope: VoucherScope,
    categoryIds?: string[],
    productIds?: string[],
  ) {
    if (
      scope === VoucherScope.CATEGORY &&
      (!categoryIds || categoryIds.length === 0)
    ) {
      throw new BadRequestException({
        code: 'CATEGORY_IDS_REQUIRED',
        message: 'categoryIds is required when scope is CATEGORY',
      });
    }
    if (
      scope === VoucherScope.PRODUCT &&
      (!productIds || productIds.length === 0)
    ) {
      throw new BadRequestException({
        code: 'PRODUCT_IDS_REQUIRED',
        message: 'productIds is required when scope is PRODUCT',
      });
    }
  }

  private handleUniqueConstraintError(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = (error.meta?.target as string[]) ?? [];
      if (target.includes('code')) {
        throw new ConflictException({
          code: 'VOUCHER_CODE_ALREADY_IN_USE',
          message: 'Voucher code is already in use',
        });
      }
      throw new ConflictException({
        code: 'UNIQUE_CONSTRAINT_VIOLATION',
        message: `Field ${target.join(', ')} must be unique`,
      });
    }
  }
}
