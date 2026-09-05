import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import slugify from 'slugify';
import * as ExcelJS from 'exceljs';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

import {
  PublicProductSortBy,
  QueryPublicProductsDto,
} from './dto/query-public-products.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

import { CloudinaryService } from '@/common/cloudinary/cloudinary.service';

const PRODUCT_INCLUDE = {
  materials: { orderBy: { sortOrder: 'asc' } },
  variants: {
    orderBy: { sortOrder: 'asc' },
    include: { images: { orderBy: { sortOrder: 'asc' } } },
  },
  images: { where: { variantId: null }, orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof PRODUCT_INCLUDE;
}>;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async findById(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: PRODUCT_INCLUDE,
    });
    return product ? this.withTotalStock(product) : null;
  }

  async findByIdOrThrow(id: string) {
    const product = await this.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async findAll(query: QueryProductsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where = this.buildWhere(query);

    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: PRODUCT_INCLUDE,
      }),
      this.prisma.product.count({ where }),
    ]);

    const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;

    return {
      data: data.map((product) => this.withTotalStock(product)),
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

  async findAllPublic(query: QueryPublicProductsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where = this.buildPublicWhere(query);
    const orderBy = this.buildPublicOrderBy(query.sortBy);

    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: PRODUCT_INCLUDE,
      }),
      this.prisma.product.count({ where }),
    ]);

    const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;

    return {
      data: data.map((product) => this.withTotalStock(product)),
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

  async getAvailableColorsPublic(categoryId?: string) {
    const variants = await this.prisma.productVariant.findMany({
      where: {
        colorName: { not: null },
        product: {
          deletedAt: null,
          status: ProductStatus.ACTIVE,
          ...(categoryId && { categoryId }),
        },
      },
      distinct: ['colorName'],
      select: { colorName: true, colorHex: true },
      orderBy: { colorName: 'asc' },
    });

    return variants.map((v) => ({
      name: v.colorName as string,
      hex: v.colorHex,
    }));
  }

  private buildPublicOrderBy(
    sortBy?: PublicProductSortBy,
  ):
    | Prisma.ProductOrderByWithRelationInput
    | Prisma.ProductOrderByWithRelationInput[] {
    switch (sortBy) {
      case PublicProductSortBy.PRICE_ASC:
        return { price: 'asc' };
      case PublicProductSortBy.PRICE_DESC:
        return { price: 'desc' };
      case PublicProductSortBy.BEST_SELLING:
        return [{ soldCount: 'desc' }, { id: 'asc' }];
      case PublicProductSortBy.NEWEST:
      default:
        return { createdAt: 'desc' };
    }
  }

  async findBySlugPublic(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: ProductStatus.ACTIVE, deletedAt: null },
      include: PRODUCT_INCLUDE,
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.withTotalStock(product);
  }

  async findSlugsByIds(ids: string[]) {
    return this.prisma.product.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
        status: ProductStatus.ACTIVE,
      },
      select: { id: true, slug: true },
    });
  }

  private encodeCursor(phase: 'category' | 'other', id: string): string {
    return Buffer.from(JSON.stringify({ phase, id })).toString('base64url');
  }

  private decodeCursor(cursor: string): {
    phase: 'category' | 'other';
    id: string;
  } {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
    } catch {
      throw new BadRequestException('Invalid cursor');
    }
  }

  async findRelatedProducts(slug: string, cursor?: string, limit = 12) {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: ProductStatus.ACTIVE, deletedAt: null },
      select: { id: true, categoryId: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const excludeSelf: Prisma.ProductWhereInput = {
      id: { not: product.id },
      status: ProductStatus.ACTIVE,
      deletedAt: null,
    };

    const categoryWhere: Prisma.ProductWhereInput = product.categoryId
      ? { ...excludeSelf, categoryId: product.categoryId }
      : { ...excludeSelf, id: 'never-matches' };

    const otherWhere: Prisma.ProductWhereInput = product.categoryId
      ? { ...excludeSelf, categoryId: { not: product.categoryId } }
      : excludeSelf;

    const orderBy: Prisma.ProductOrderByWithRelationInput[] = [
      { soldCount: 'desc' },
      { id: 'asc' },
    ];

    let phase: 'category' | 'other' = 'category';
    let afterId: string | undefined;

    if (cursor) {
      const decoded = this.decodeCursor(cursor);
      phase = decoded.phase;
      afterId = decoded.id || undefined;
    }

    let related: ProductWithRelations[] = [];
    let nextCursor: string | null = null;

    if (phase === 'category') {
      const page = await this.prisma.product.findMany({
        where: categoryWhere,
        take: limit + 1,
        ...(afterId && { cursor: { id: afterId }, skip: 1 }),
        orderBy,
        include: PRODUCT_INCLUDE,
      });

      const hasMoreInCategory = page.length > limit;
      related = page.slice(0, limit);

      if (hasMoreInCategory) {
        nextCursor = this.encodeCursor(
          'category',
          related[related.length - 1].id,
        );
      } else {
        const remaining = limit - related.length;
        if (remaining > 0) {
          const fallback = await this.prisma.product.findMany({
            where: otherWhere,
            take: remaining + 1,
            orderBy,
            include: PRODUCT_INCLUDE,
          });
          const hasMoreOther = fallback.length > remaining;
          const fallbackItems = fallback.slice(0, remaining);
          related = [...related, ...fallbackItems];
          if (hasMoreOther) {
            nextCursor = this.encodeCursor(
              'other',
              fallbackItems[fallbackItems.length - 1].id,
            );
          }
        } else {
          const hasOther = await this.prisma.product.findFirst({
            where: otherWhere,
            select: { id: true },
          });
          if (hasOther) {
            nextCursor = this.encodeCursor('other', '');
          }
        }
      }
    } else {
      const page = await this.prisma.product.findMany({
        where: otherWhere,
        take: limit + 1,
        ...(afterId && { cursor: { id: afterId }, skip: 1 }),
        orderBy,
        include: PRODUCT_INCLUDE,
      });

      const hasMore = page.length > limit;
      related = page.slice(0, limit);
      if (hasMore) {
        nextCursor = this.encodeCursor('other', related[related.length - 1].id);
      }
    }

    return {
      data: related.map((p) => this.withTotalStock(p)),
      meta: {
        nextCursor,
        hasNextPage: !!nextCursor,
      },
    };
  }

  async findBestSellersPublic(query: QueryPublicProductsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where = {
      ...this.buildPublicWhere(query),
      soldCount: { gt: 0 },
    };

    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ soldCount: 'desc' }, { id: 'asc' }],
        include: PRODUCT_INCLUDE,
      }),
      this.prisma.product.count({ where }),
    ]);

    const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;

    return {
      data: data.map((product) => this.withTotalStock(product)),
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

  private buildVariantFilter(
    outOfStock?: boolean,
    colors?: string[],
  ): Prisma.ProductWhereInput['variants'] | undefined {
    const hasColors = !!colors?.length;

    if (outOfStock === undefined && !hasColors) {
      return undefined;
    }

    const colorCondition: Prisma.ProductVariantWhereInput = hasColors
      ? { colorName: { in: colors } }
      : {};

    if (outOfStock === undefined) {
      return { some: colorCondition };
    }

    if (outOfStock) {
      return {
        ...(hasColors && { some: colorCondition }),
        none: { ...colorCondition, stock: { gt: 0 } },
      };
    }

    return {
      some: { ...colorCondition, stock: { gt: 0 } },
    };
  }

  private buildPublicWhere(
    query: QueryPublicProductsDto,
  ): Prisma.ProductWhereInput {
    const {
      search,
      categoryId,
      outOfStock,
      colors,
      minPrice,
      maxPrice,
      onSale,
    } = query;

    const variantFilter = this.buildVariantFilter(outOfStock, colors);

    return {
      deletedAt: null,
      status: ProductStatus.ACTIVE,
      ...(categoryId && { categoryId }),
      ...(variantFilter && { variants: variantFilter }),
      ...(onSale && {
        compareAtPrice: { not: null },
      }),
      ...((minPrice !== undefined || maxPrice !== undefined) && {
        price: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice }),
        },
      }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { sku: { contains: search, mode: Prisma.QueryMode.insensitive } },
        ],
      }),
    };
  }

  async exportToExcel(query: QueryProductsDto): Promise<Buffer> {
    const where = this.buildWhere(query);

    const MAX_EXPORT_ROWS = 20000;
    const totalItems = await this.prisma.product.count({ where });
    if (totalItems > MAX_EXPORT_ROWS) {
      throw new BadRequestException({
        code: 'EXPORT_TOO_LARGE',
        message: `Export exceeds ${MAX_EXPORT_ROWS} rows. Please narrow your filters.`,
      });
    }

    const products = await this.prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { variants: true },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Products');

    sheet.columns = [
      { header: 'Tên sản phẩm', key: 'name', width: 30 },
      { header: 'SKU', key: 'sku', width: 20 },
      { header: 'Giá', key: 'price', width: 15 },
      { header: 'Tồn kho', key: 'stock', width: 12 },
      { header: 'Trạng thái', key: 'status', width: 15 },
      { header: 'Ngày tạo', key: 'createdAt', width: 20 },
    ];
    sheet.getRow(1).font = { bold: true };

    const statusLabel: Record<ProductStatus, string> = {
      DRAFT: 'Bản nháp',
      ACTIVE: 'Đang bán',
      ARCHIVED: 'Ngừng bán',
    };

    products.forEach((product) => {
      const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
      sheet.addRow({
        name: product.name,
        sku: product.sku,
        price: product.price.toString(),
        stock: totalStock,
        status: statusLabel[product.status],
        createdAt: product.createdAt.toLocaleDateString('vi-VN'),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async create(dto: CreateProductDto) {
    const slug = await this.generateUniqueSlug(dto.name);

    try {
      const product = await this.prisma.product.create({
        data: {
          name: dto.name,
          slug,
          sku: dto.sku,
          description: dto.description,
          price: dto.price,
          compareAtPrice: dto.compareAtPrice,
          length: dto.length,
          width: dto.width,
          height: dto.height,
          categoryId: dto.categoryId,
          status: dto.status ?? ProductStatus.DRAFT,
          materials: dto.materials?.length
            ? {
                create: dto.materials.map((m, i) => ({
                  label: m.label,
                  value: m.value,
                  sortOrder: m.sortOrder ?? i,
                })),
              }
            : undefined,
          variants: dto.variants?.length
            ? {
                create: dto.variants.map((v, i) => ({
                  name: v.name,
                  colorHex: v.colorHex,
                  colorName: v.colorName,
                  priceOverride: v.priceOverride,
                  stock: v.stock,
                  sortOrder: v.sortOrder ?? i,
                })),
              }
            : undefined,
        },
        include: PRODUCT_INCLUDE,
      });
      return this.withTotalStock(product);
    } catch (error) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findByIdOrThrow(id);

    const { materials, ...rest } = dto;
    const data: Prisma.ProductUncheckedUpdateInput = { ...rest };

    if (dto.name) {
      data.slug = await this.generateUniqueSlug(dto.name, id);
    }

    try {
      const product = await this.prisma.$transaction(async (tx) => {
        if (materials) {
          await tx.productMaterial.deleteMany({ where: { productId: id } });
          if (materials.length) {
            await tx.productMaterial.createMany({
              data: materials.map((m, i) => ({
                productId: id,
                label: m.label,
                value: m.value,
                sortOrder: m.sortOrder ?? i,
              })),
            });
          }
        }
        return tx.product.update({
          where: { id },
          data,
          include: PRODUCT_INCLUDE,
        });
      });
      return this.withTotalStock(product);
    } catch (error) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  async updateStatus(id: string, status: ProductStatus) {
    await this.findByIdOrThrow(id);
    await this.prisma.product.update({
      where: { id },
      data: { status },
    });
    return this.findByIdOrThrow(id);
  }

  async addVariant(productId: string, dto: CreateVariantDto) {
    await this.findByIdOrThrow(productId);
    const count = await this.prisma.productVariant.count({
      where: { productId },
    });
    await this.prisma.productVariant.create({
      data: {
        productId,
        name: dto.name,
        colorHex: dto.colorHex,
        colorName: dto.colorName,
        priceOverride: dto.priceOverride,
        stock: dto.stock,
        sortOrder: dto.sortOrder ?? count,
      },
    });
    return this.findByIdOrThrow(productId);
  }

  async updateVariant(
    productId: string,
    variantId: string,
    dto: UpdateVariantDto,
  ) {
    await this.findVariantOrThrow(productId, variantId);
    await this.prisma.productVariant.update({
      where: { id: variantId },
      data: dto,
    });
    return this.findByIdOrThrow(productId);
  }

  async removeVariant(productId: string, variantId: string) {
    await this.findVariantOrThrow(productId, variantId);
    await this.prisma.productVariant.delete({ where: { id: variantId } });
    return this.findByIdOrThrow(productId);
  }

  private async findVariantOrThrow(productId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }
    return variant;
  }

  async addImages(
    productId: string,
    files: Express.Multer.File[],
    variantId?: string,
  ) {
    await this.findByIdOrThrow(productId);
    if (variantId) await this.findVariantOrThrow(productId, variantId);

    const uploadResults = await Promise.all(
      files.map((file) => this.cloudinary.uploadProductImage(file)),
    );

    let count = await this.prisma.productImage.count({
      where: { productId, variantId: variantId ?? null },
    });

    await this.prisma.$transaction(
      uploadResults.map((result, i) =>
        this.prisma.productImage.create({
          data: {
            productId,
            variantId,
            url: result.secure_url,
            sortOrder: count + i,
            isThumbnail: count + i === 0,
          },
        }),
      ),
    );

    return this.findByIdOrThrow(productId);
  }

  async removeImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) {
      throw new NotFoundException('Image not found on this product');
    }

    const publicId = this.cloudinary.extractPublicId(image.url);
    if (publicId) {
      await this.cloudinary.deleteAsset(publicId).catch(() => undefined);
    }

    await this.prisma.productImage.delete({ where: { id: imageId } });
    return this.findByIdOrThrow(productId);
  }

  async remove(id: string) {
    await this.findByIdOrThrow(id);
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), status: ProductStatus.ARCHIVED },
    });
  }

  async bulkRemove(ids: string[]) {
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });

    const foundIds = products.map((product) => product.id);
    const notFoundIds = ids.filter((id) => !foundIds.includes(id));

    if (notFoundIds.length > 0) {
      throw new NotFoundException({
        code: 'PRODUCTS_NOT_FOUND',
        message: `The following product IDs were not found: ${notFoundIds.join(', ')}`,
      });
    }

    const now = new Date();
    const result = await this.prisma.product.updateMany({
      where: { id: { in: foundIds } },
      data: { deletedAt: now, status: ProductStatus.ARCHIVED },
    });

    return { deletedCount: result.count };
  }

  async restore(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product || !product.deletedAt) {
      throw new NotFoundException('Deleted product not found');
    }
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  private withTotalStock(product: ProductWithRelations) {
    return {
      ...product,
      totalStock: product.variants.reduce((sum, v) => sum + v.stock, 0),
    };
  }

  private buildWhere(query: QueryProductsDto): Prisma.ProductWhereInput {
    const {
      search,
      status,
      categoryId,
      outOfStock,
      colors,
      minPrice,
      maxPrice,
    } = query;

    const variantFilter = this.buildVariantFilter(outOfStock, colors);

    return {
      deletedAt: null,
      ...(status && { status }),
      ...(categoryId && { categoryId }),
      ...(variantFilter && { variants: variantFilter }),
      ...((minPrice !== undefined || maxPrice !== undefined) && {
        price: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice }),
        },
      }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { sku: { contains: search, mode: Prisma.QueryMode.insensitive } },
        ],
      }),
    };
  }

  private handleUniqueConstraintError(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = (error.meta?.target as string[]) ?? [];

      if (target.includes('sku')) {
        throw new ConflictException({
          code: 'SKU_ALREADY_IN_USE',
          message: 'SKU is already in use',
        });
      }
      if (target.includes('slug')) {
        throw new ConflictException({
          code: 'SLUG_ALREADY_IN_USE',
          message: 'Slug is already in use',
        });
      }

      throw new ConflictException({
        code: 'UNIQUE_CONSTRAINT_VIOLATION',
        message: `Field ${target.join(', ')} must be unique`,
      });
    }
  }

  private async generateUniqueSlug(name: string, excludeId?: string) {
    const baseSlug = slugify(name, { lower: true, locale: 'vi', strict: true });
    let slug = baseSlug;
    let suffix = 1;

    while (
      await this.prisma.product.findFirst({
        where: { slug, ...(excludeId && { id: { not: excludeId } }) },
      })
    ) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    if (!slug) {
      throw new BadRequestException('Unable to generate slug from name');
    }

    return slug;
  }
}
