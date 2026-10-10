import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PostStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

import {
  PublicPostSortBy,
  QueryPublicPostsDto,
} from './dto/query-public-posts.dto';
import { QueryPostsDto } from './dto/query-posts.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

import {
  getPagination,
  paginated,
  ensureUniqueSlug,
  assertExportLimit,
  createExcelBuffer,
  formatDateVi,
  rethrowUniqueConstraint,
  type ExcelColumn,
} from '@/common/utils';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.post.findFirst({ where: { id, deletedAt: null } });
  }

  async findByIdOrThrow(id: string) {
    const post = await this.findById(id);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  async findAll(query: QueryPostsDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where = this.buildWhere(query);

    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.post.count({ where }),
    ]);

    return paginated(data, page, limit, totalItems);
  }

  async findAllPublic(query: QueryPublicPostsDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where = this.buildPublicWhere(query);
    const orderBy = this.buildPublicOrderBy(query.sortBy);

    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        skip,
        take,
        orderBy,
      }),
      this.prisma.post.count({ where }),
    ]);

    return paginated(data, page, limit, totalItems);
  }

  async findBySlugPublic(slug: string) {
    const post = await this.prisma.post.findFirst({
      where: { slug, status: PostStatus.PUBLISHED, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.prisma.post.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    });
  }

  async create(dto: CreatePostDto) {
    const slug = await this.generateUniqueSlug(dto.title);
    const status = dto.status ?? PostStatus.DRAFT;

    try {
      return await this.prisma.post.create({
        data: {
          title: dto.title,
          slug,
          excerpt: dto.excerpt,
          thumbnailUrl: dto.thumbnailUrl,
          content: dto.content,
          status,
          publishedAt: status === PostStatus.PUBLISHED ? new Date() : null,
        },
      });
    } catch (error) {
      rethrowUniqueConstraint(error);
    }
  }

  async exportToExcel(query: QueryPostsDto): Promise<Buffer> {
    const where = this.buildWhere(query);

    const totalItems = await this.prisma.post.count({ where });
    assertExportLimit(totalItems);

    const posts = await this.prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const statusLabel: Record<PostStatus, string> = {
      DRAFT: 'Bản nháp',
      PUBLISHED: 'Đã đăng',
      ARCHIVED: 'Đã lưu trữ',
    };

    const columns: ExcelColumn[] = [
      { header: 'Tiêu đề', key: 'title', width: 35 },
      { header: 'Lượt xem', key: 'viewCount', width: 12 },
      { header: 'Trạng thái', key: 'status', width: 15 },
      { header: 'Ngày đăng', key: 'publishedAt', width: 20 },
      { header: 'Ngày tạo', key: 'createdAt', width: 20 },
    ];

    const rows = posts.map((post) => ({
      title: post.title,
      viewCount: post.viewCount,
      status: statusLabel[post.status],
      publishedAt: formatDateVi(post.publishedAt, 'Chưa đăng'),
      createdAt: formatDateVi(post.createdAt),
    }));

    return createExcelBuffer({ sheetName: 'Posts', columns, rows });
  }

  async update(id: string, dto: UpdatePostDto) {
    const existing = await this.findByIdOrThrow(id);

    const data: Prisma.PostUncheckedUpdateInput = { ...dto };

    if (dto.title) {
      data.slug = await this.generateUniqueSlug(dto.title, id);
    }

    if (dto.status && dto.status !== existing.status) {
      data.publishedAt =
        dto.status === PostStatus.PUBLISHED
          ? (existing.publishedAt ?? new Date())
          : existing.publishedAt;
    }

    try {
      return await this.prisma.post.update({ where: { id }, data });
    } catch (error) {
      rethrowUniqueConstraint(error);
    }
  }

  async updateStatus(id: string, status: PostStatus) {
    const existing = await this.findByIdOrThrow(id);

    return this.prisma.post.update({
      where: { id },
      data: {
        status,
        publishedAt:
          status === PostStatus.PUBLISHED
            ? (existing.publishedAt ?? new Date())
            : existing.publishedAt,
      },
    });
  }

  async remove(id: string) {
    await this.findByIdOrThrow(id);
    await this.prisma.post.update({
      where: { id },
      data: { deletedAt: new Date(), status: PostStatus.ARCHIVED },
    });
  }

  async bulkRemove(ids: string[]) {
    const posts = await this.prisma.post.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });

    const foundIds = posts.map((post) => post.id);
    const notFoundIds = ids.filter((id) => !foundIds.includes(id));

    if (notFoundIds.length > 0) {
      throw new NotFoundException({
        code: 'POSTS_NOT_FOUND',
        message: `The following post IDs were not found: ${notFoundIds.join(', ')}`,
      });
    }

    const result = await this.prisma.post.updateMany({
      where: { id: { in: foundIds } },
      data: { deletedAt: new Date(), status: PostStatus.ARCHIVED },
    });

    return { deletedCount: result.count };
  }

  private buildWhere(query: QueryPostsDto): Prisma.PostWhereInput {
    const { search, status } = query;
    return {
      deletedAt: null,
      ...(status && { status }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { excerpt: { contains: search, mode: Prisma.QueryMode.insensitive } },
        ],
      }),
    };
  }

  private buildPublicWhere(query: QueryPublicPostsDto): Prisma.PostWhereInput {
    const { search } = query;
    return {
      deletedAt: null,
      status: PostStatus.PUBLISHED,
      ...(search && {
        OR: [
          { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { excerpt: { contains: search, mode: Prisma.QueryMode.insensitive } },
        ],
      }),
    };
  }

  private buildPublicOrderBy(
    sortBy?: PublicPostSortBy,
  ): Prisma.PostOrderByWithRelationInput {
    switch (sortBy) {
      case PublicPostSortBy.POPULAR:
        return { viewCount: 'desc' };
      case PublicPostSortBy.NEWEST:
      default:
        return { publishedAt: 'desc' };
    }
  }

  private async generateUniqueSlug(title: string, excludeId?: string) {
    return ensureUniqueSlug(title, async (slug) => {
      const existing = await this.prisma.post.findFirst({
        where: { slug, ...(excludeId && { id: { not: excludeId } }) },
      });
      return !!existing;
    });
  }
}
