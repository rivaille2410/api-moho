import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CloudinaryService } from '@/common/cloudinary/cloudinary.service';

import {
  ReviewSort,
  QueryPublicReviewsDto,
} from './dto/query-public-reviews.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { CreateCustomerReviewDto } from './dto/create-customer-review.dto';
import { AuthorStats, ReviewWithRelations } from './dto/review-response.dto';

const COMMENT_PREVIEW_TAKE = 2;

const REVIEW_INCLUDE = {
  user: true,
  images: true,
  helpfulVotes: true,
  variant: true,
  comments: {
    where: { parentId: null },
    take: COMMENT_PREVIEW_TAKE,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
    },
  },
  _count: {
    select: { comments: true },
  },
  product: {
    select: {
      name: true,
      slug: true,
      images: {
        where: { isThumbnail: true },
        select: { url: true },
        take: 1,
      },
    },
  },
} satisfies Prisma.ReviewInclude;

export interface ReviewWithStats {
  review: ReviewWithRelations;
  stats?: AuthorStats;
}

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async findAll(query: QueryReviewsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where = this.buildWhere(query);

    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: REVIEW_INCLUDE,
      }),
      this.prisma.review.count({ where }),
    ]);

    const withStats = await this.attachAuthorStats(data);
    return { data: withStats, meta: this.buildMeta(page, limit, totalItems) };
  }

  async findByIdOrThrow(id: string): Promise<ReviewWithStats> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: REVIEW_INCLUDE,
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    const [withStats] = await this.attachAuthorStats([review]);
    return withStats;
  }

  async create(dto: CreateReviewDto): Promise<ReviewWithStats> {
    await this.ensureProductExists(dto.productId);
    if (dto.userId) {
      await this.ensureUserExists(dto.userId);
    }
    if (dto.variantId) {
      await this.ensureVariantBelongsToProduct(dto.variantId, dto.productId);
    }

    const variant = dto.variantId
      ? await this.prisma.productVariant.findUnique({
          where: { id: dto.variantId },
        })
      : null;

    const review = await this.prisma.review.create({
      data: {
        productId: dto.productId,
        userId: dto.userId,
        authorName: dto.authorName,
        rating: dto.rating,
        content: dto.content,
        variantId: dto.variantId,
        variantLabel: variant?.name,
        usedForLabel: dto.usedForLabel,
        verifiedPurchase: dto.verifiedPurchase ?? false,
      },
      include: REVIEW_INCLUDE,
    });
    const [withStats] = await this.attachAuthorStats([review]);
    return withStats;
  }

  async update(id: string, dto: UpdateReviewDto): Promise<ReviewWithStats> {
    await this.findByIdOrThrow(id);
    if (dto.userId) {
      await this.ensureUserExists(dto.userId);
    }

    const updated = await this.prisma.review.update({
      where: { id },
      data: dto,
      include: REVIEW_INCLUDE,
    });
    const [withStats] = await this.attachAuthorStats([updated]);
    return withStats;
  }

  async remove(id: string) {
    await this.findByIdOrThrow(id);
    await this.prisma.review.delete({ where: { id } });
  }

  async addImages(
    id: string,
    files: Express.Multer.File[],
  ): Promise<ReviewWithStats> {
    await this.findByIdOrThrow(id);

    const uploadResults = await Promise.all(
      files.map((file) => this.cloudinary.uploadProductImage(file)),
    );

    await this.prisma.reviewImage.createMany({
      data: uploadResults.map((result) => ({
        reviewId: id,
        url: result.secure_url,
      })),
    });

    return this.findByIdOrThrow(id);
  }

  async removeImage(id: string, imageId: string): Promise<ReviewWithStats> {
    const image = await this.prisma.reviewImage.findFirst({
      where: { id: imageId, reviewId: id },
    });
    if (!image) {
      throw new NotFoundException('Image not found on this review');
    }

    const publicId = this.cloudinary.extractPublicId(image.url);
    if (publicId) {
      await this.cloudinary.deleteAsset(publicId).catch(() => undefined);
    }

    await this.prisma.reviewImage.delete({ where: { id: imageId } });
    return this.findByIdOrThrow(id);
  }

  async findAllForProductPublic(slug: string, query: QueryPublicReviewsDto) {
    const product = await this.prisma.product.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: Prisma.ReviewWhereInput = {
      productId: product.id,
      ...(query.rating && { rating: query.rating }),
      ...(query.hasImages && { images: { some: {} } }),
    };

    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: query.sort === ReviewSort.OLDEST ? 'asc' : 'desc',
        },
        include: REVIEW_INCLUDE,
      }),
      this.prisma.review.count({ where }),
    ]);

    const withStats = await this.attachAuthorStats(data);
    return { data: withStats, meta: this.buildMeta(page, limit, totalItems) };
  }

  async getRatingSummaryPublic(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const rows = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { productId: product.id },
      _count: { rating: true },
    });

    const breakdown: Record<string, number> = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
    };
    let total = 0;
    let weightedSum = 0;

    rows.forEach((row) => {
      breakdown[String(row.rating)] = row._count.rating;
      total += row._count.rating;
      weightedSum += row.rating * row._count.rating;
    });

    return {
      average: total > 0 ? Number((weightedSum / total).toFixed(1)) : 0,
      total,
      breakdown,
    };
  }

  async getReviewedProductIds(
    userId: string,
    productIds: string[],
  ): Promise<Set<string>> {
    const unique = [...new Set(productIds)];
    if (unique.length === 0) return new Set();

    const reviews = await this.prisma.review.findMany({
      where: { userId, productId: { in: unique } },
      select: { productId: true },
    });
    return new Set(reviews.map((r) => r.productId));
  }

  async createByCustomer(
    slug: string,
    userId: string,
    dto: CreateCustomerReviewDto,
  ): Promise<ReviewWithStats> {
    const product = await this.prisma.product.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const user = await this.ensureUserExists(userId);

    if (dto.variantId) {
      await this.ensureVariantBelongsToProduct(dto.variantId, product.id);
    }

    const existing = await this.prisma.review.findFirst({
      where: { productId: product.id, userId },
    });
    if (existing) {
      throw new ConflictException({
        code: 'ALREADY_REVIEWED',
        message: 'You have already reviewed this product',
      });
    }

    const variant = dto.variantId
      ? await this.prisma.productVariant.findUnique({
          where: { id: dto.variantId },
        })
      : null;

    const review = await this.prisma.review.create({
      data: {
        productId: product.id,
        userId,
        authorName: user.name,
        rating: dto.rating,
        content: dto.content,
        variantId: dto.variantId,
        variantLabel: variant?.name,
        verifiedPurchase: false,
      },
      include: REVIEW_INCLUDE,
    });
    const [withStats] = await this.attachAuthorStats([review]);
    return withStats;
  }

  async toggleHelpful(
    slug: string,
    reviewId: string,
    userId: string,
  ): Promise<ReviewWithStats> {
    const product = await this.prisma.product.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, productId: product.id },
      select: { id: true },
    });
    if (!review) {
      throw new NotFoundException('Review not found on this product');
    }

    const existing = await this.prisma.reviewHelpful.findUnique({
      where: { reviewId_userId: { reviewId, userId } },
    });

    if (existing) {
      await this.prisma.reviewHelpful.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.reviewHelpful.create({ data: { reviewId, userId } });
    }

    return this.findByIdOrThrow(reviewId);
  }

  private async attachAuthorStats(
    reviews: ReviewWithRelations[],
  ): Promise<ReviewWithStats[]> {
    const userIds = [
      ...new Set(
        reviews.map((r) => r.userId).filter((id): id is string => !!id),
      ),
    ];

    if (userIds.length === 0) {
      return reviews.map((review) => ({ review }));
    }

    const [users, reviewCounts, helpfulByAuthor] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, createdAt: true },
      }),
      this.prisma.review.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds } },
        _count: { _all: true },
      }),
      this.prisma.reviewHelpful.findMany({
        where: { review: { userId: { in: userIds } } },
        select: { review: { select: { userId: true } } },
      }),
    ]);

    const usersById = new Map(users.map((u) => [u.id, u]));
    const reviewCountByUser = new Map(
      reviewCounts.map((row) => [row.userId as string, row._count._all]),
    );

    const thanksByUser = new Map<string, number>();
    for (const vote of helpfulByAuthor) {
      const uid = vote.review.userId;
      if (!uid) continue;
      thanksByUser.set(uid, (thanksByUser.get(uid) ?? 0) + 1);
    }

    const nowYear = new Date().getFullYear();

    return reviews.map((review) => {
      if (!review.userId) return { review };

      const user = usersById.get(review.userId);
      const stats: AuthorStats = {
        memberSinceYears: user
          ? Math.max(0, nowYear - user.createdAt.getFullYear())
          : 0,
        reviewCount: reviewCountByUser.get(review.userId) ?? 0,
        thanksCount: thanksByUser.get(review.userId) ?? 0,
      };

      return { review, stats };
    });
  }

  private async ensureProductExists(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private async ensureVariantBelongsToProduct(
    variantId: string,
    productId: string,
  ) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      select: { id: true },
    });
    if (!variant) {
      throw new NotFoundException('Variant not found on this product');
    }
    return variant;
  }

  private buildWhere(query: QueryReviewsDto): Prisma.ReviewWhereInput {
    const { productId, rating, search } = query;
    return {
      ...(productId && { productId }),
      ...(rating && { rating }),
      ...(search && {
        OR: [
          {
            authorName: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          { content: { contains: search, mode: Prisma.QueryMode.insensitive } },
        ],
      }),
    };
  }

  private buildMeta(page: number, limit: number, totalItems: number) {
    const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;
    return {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}
