import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import slugify from 'slugify';
import { Prisma, PostStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

import {
  PublicPostSortBy,
  QueryPublicPostsDto,
} from './dto/query-public-posts.dto';
import { QueryPostsDto } from './dto/query-posts.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

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
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where = this.buildWhere(query);

    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.post.count({ where }),
    ]);

    return this.paginate(data, totalItems, page, limit);
  }

  async findAllPublic(query: QueryPublicPostsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where = this.buildPublicWhere(query);
    const orderBy = this.buildPublicOrderBy(query.sortBy);

    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
      this.prisma.post.count({ where }),
    ]);

    return this.paginate(data, totalItems, page, limit);
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
      this.handleUniqueConstraintError(error);
      throw error;
    }
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
      this.handleUniqueConstraintError(error);
      throw error;
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

  private handleUniqueConstraintError(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = (error.meta?.target as string[]) ?? [];
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

  private async generateUniqueSlug(title: string, excludeId?: string) {
    const baseSlug = slugify(title, {
      lower: true,
      locale: 'vi',
      strict: true,
    });
    let slug = baseSlug;
    let suffix = 1;

    while (
      await this.prisma.post.findFirst({
        where: { slug, ...(excludeId && { id: { not: excludeId } }) },
      })
    ) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    if (!slug) {
      throw new BadRequestException('Unable to generate slug from title');
    }

    return slug;
  }
}
