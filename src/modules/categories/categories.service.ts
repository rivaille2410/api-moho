import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import slugify from 'slugify';
import * as ExcelJS from 'exceljs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import { CategoryTreeNodeDto } from './dto/category-tree-node.dto';
import { QueryPublicCategoriesDto } from './dto/query-public-categories.dto';

const WITH_COUNT = {
  _count: { select: { products: true, children: true } },
} satisfies Prisma.CategoryInclude;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.category.findFirst({
      where: { id, deletedAt: null },
      include: WITH_COUNT,
    });
  }

  async findByIdOrThrow(id: string) {
    const category = await this.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async findAll(query: QueryCategoriesDto) {
    const where = this.buildWhere(query);

    return this.prisma.category.findMany({
      where,
      include: WITH_COUNT,
      orderBy: { name: 'asc' },
    });
  }

  async findAllPublic(query: QueryPublicCategoriesDto) {
    const { parentId, rootOnly } = query;

    const where: Prisma.CategoryWhereInput = {
      deletedAt: null,
      ...(rootOnly && { parentId: null }),
      ...(parentId && { parentId }),
    };

    return this.prisma.category.findMany({
      where,
      select: { id: true, name: true, slug: true, parentId: true },
      orderBy: { name: 'asc' },
    });
  }

  async findTree(): Promise<CategoryTreeNodeDto[]> {
    const categories = await this.prisma.category.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, slug: true, parentId: true },
      orderBy: { name: 'asc' },
    });

    const byParent = new Map<string | null, typeof categories>();
    for (const category of categories) {
      const key = category.parentId;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(category);
    }

    const build = (parentId: string | null): CategoryTreeNodeDto[] => {
      const children = byParent.get(parentId) ?? [];
      return children.map(
        (c) =>
          new CategoryTreeNodeDto({
            id: c.id,
            name: c.name,
            slug: c.slug,
            children: build(c.id),
          }),
      );
    };

    return build(null);
  }

  async create(dto: CreateCategoryDto) {
    if (dto.parentId) {
      await this.findByIdOrThrow(dto.parentId);
    }

    const slug = await this.generateUniqueSlug(dto.name);

    try {
      return await this.prisma.category.create({
        data: {
          name: dto.name,
          slug,
          parentId: dto.parentId,
        },
        include: WITH_COUNT,
      });
    } catch (error) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  async exportToExcel(query: QueryCategoriesDto): Promise<Buffer> {
    const where = this.buildWhere(query);

    const MAX_EXPORT_ROWS = 20000;
    const totalItems = await this.prisma.category.count({ where });
    if (totalItems > MAX_EXPORT_ROWS) {
      throw new BadRequestException({
        code: 'EXPORT_TOO_LARGE',
        message: `Export exceeds ${MAX_EXPORT_ROWS} rows. Please narrow your filters.`,
      });
    }

    const categories = await this.prisma.category.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        parent: { select: { name: true } },
        _count: { select: { products: true } },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Categories');

    sheet.columns = [
      { header: 'Tên danh mục', key: 'name', width: 30 },
      { header: 'Slug', key: 'slug', width: 25 },
      { header: 'Danh mục cha', key: 'parent', width: 25 },
      { header: 'Số sản phẩm', key: 'productCount', width: 15 },
      { header: 'Ngày tạo', key: 'createdAt', width: 20 },
    ];
    sheet.getRow(1).font = { bold: true };

    categories.forEach((category) => {
      sheet.addRow({
        name: category.name,
        slug: category.slug,
        parent: category.parent?.name ?? '—',
        productCount: category._count.products,
        createdAt: category.createdAt.toLocaleDateString('vi-VN'),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findByIdOrThrow(id);

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException({
          code: 'INVALID_PARENT',
          message: 'A category cannot be its own parent',
        });
      }

      await this.findByIdOrThrow(dto.parentId);

      const descendantIds = await this.collectDescendantIds(id);
      if (descendantIds.has(dto.parentId)) {
        throw new BadRequestException({
          code: 'CIRCULAR_CATEGORY_REFERENCE',
          message: 'Cannot move a category under its own descendant',
        });
      }
    }

    const data: Prisma.CategoryUncheckedUpdateInput = { ...dto };

    if (dto.name) {
      data.slug = await this.generateUniqueSlug(dto.name, id);
    }

    try {
      return await this.prisma.category.update({
        where: { id },
        data,
        include: WITH_COUNT,
      });
    } catch (error) {
      this.handleUniqueConstraintError(error);
      throw error;
    }
  }

  async removeMany(ids: string[]) {
    const categories = await this.prisma.category.findMany({
      where: { id: { in: ids }, deletedAt: null },
      include: WITH_COUNT,
    });

    const foundIds = new Set(categories.map((c) => c.id));
    const notFoundIds = ids.filter((id) => !foundIds.has(id));

    const deletable: string[] = [];
    const skipped: { id: string; reason: string }[] = [];

    for (const category of categories) {
      if (category._count.children > 0) {
        skipped.push({ id: category.id, reason: 'CATEGORY_HAS_CHILDREN' });
        continue;
      }
      if (category._count.products > 0) {
        skipped.push({ id: category.id, reason: 'CATEGORY_HAS_PRODUCTS' });
        continue;
      }
      deletable.push(category.id);
    }

    notFoundIds.forEach((id) => skipped.push({ id, reason: 'NOT_FOUND' }));

    if (deletable.length > 0) {
      await this.prisma.category.updateMany({
        where: { id: { in: deletable } },
        data: { deletedAt: new Date() },
      });
    }

    return {
      deletedCount: deletable.length,
      deletedIds: deletable,
      skipped,
    };
  }

  async remove(id: string) {
    const category = await this.findByIdOrThrow(id);

    const [childrenCount, productsCount] = await this.prisma.$transaction([
      this.prisma.category.count({ where: { parentId: id, deletedAt: null } }),
      this.prisma.product.count({ where: { categoryId: id, deletedAt: null } }),
    ]);

    if (childrenCount > 0) {
      throw new BadRequestException({
        code: 'CATEGORY_HAS_CHILDREN',
        message: 'Cannot delete a category that has subcategories',
      });
    }

    if (productsCount > 0) {
      throw new BadRequestException({
        code: 'CATEGORY_HAS_PRODUCTS',
        message: 'Cannot delete a category that still has products',
      });
    }

    await this.prisma.category.update({
      where: { id: category.id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category || !category.deletedAt) {
      throw new NotFoundException('Deleted category not found');
    }
    return this.prisma.category.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  private buildWhere(query: QueryCategoriesDto): Prisma.CategoryWhereInput {
    const { search, parentId, rootOnly } = query;

    return {
      deletedAt: null,
      ...(rootOnly && { parentId: null }),
      ...(parentId && { parentId }),
      ...(search && {
        name: { contains: search, mode: Prisma.QueryMode.insensitive },
      }),
    };
  }

  private async collectDescendantIds(rootId: string): Promise<Set<string>> {
    const result = new Set<string>();
    let frontier = [rootId];

    while (frontier.length > 0) {
      const children = await this.prisma.category.findMany({
        where: { parentId: { in: frontier }, deletedAt: null },
        select: { id: true },
      });
      frontier = children.map((c) => c.id).filter((id) => !result.has(id));
      frontier.forEach((id) => result.add(id));
    }

    return result;
  }

  private handleUniqueConstraintError(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException({
        code: 'SLUG_ALREADY_IN_USE',
        message: 'A category with a similar name already exists',
      });
    }
  }

  private async generateUniqueSlug(name: string, excludeId?: string) {
    const baseSlug = slugify(name, { lower: true, locale: 'vi', strict: true });
    let slug = baseSlug;
    let suffix = 1;

    while (
      await this.prisma.category.findFirst({
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
