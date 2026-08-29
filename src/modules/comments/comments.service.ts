import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

import { CreateCommentDto } from './dto/create-comment.dto';
import { QueryCommentsDto } from './dto/query-comments.dto';
import { CommentWithRelations } from './dto/comment-response.dto';

const COMMENT_USER_SELECT = {
  id: true,
  name: true,
  avatar: true,
} as const;

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForReview(
    slug: string,
    reviewId: string,
    query: QueryCommentsDto,
  ) {
    await this.ensureReviewOnProduct(slug, reviewId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where = { reviewId, parentId: null };

    const [data, totalItems] = await this.prisma.$transaction([
      this.prisma.reviewComment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: COMMENT_USER_SELECT },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: { user: { select: COMMENT_USER_SELECT } },
          },
        },
      }),
      this.prisma.reviewComment.count({ where }),
    ]);

    return {
      data: data as unknown as CommentWithRelations[],
      meta: this.buildMeta(page, limit, totalItems),
    };
  }

  async create(
    slug: string,
    reviewId: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<CommentWithRelations> {
    await this.ensureReviewOnProduct(slug, reviewId);

    let parentId = dto.parentId ?? null;

    if (parentId) {
      const parent = await this.prisma.reviewComment.findFirst({
        where: { id: parentId, reviewId },
        select: { id: true, parentId: true },
      });
      if (!parent) {
        throw new NotFoundException('Comment being replied to was not found');
      }
      if (parent.parentId) {
        parentId = parent.parentId;
      }
    }

    const comment = await this.prisma.reviewComment.create({
      data: {
        reviewId,
        userId,
        content: dto.content,
        parentId,
      },
      include: {
        user: { select: COMMENT_USER_SELECT },
      },
    });

    return comment as unknown as CommentWithRelations;
  }

  async remove(commentId: string, userId: string, isAdmin: boolean) {
    const comment = await this.prisma.reviewComment.findUnique({
      where: { id: commentId },
      include: { _count: { select: { replies: true } } },
    });
    if (!comment || comment.deletedAt) {
      throw new NotFoundException('Comment not found');
    }

    if (!isAdmin && comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comment');
    }

    if (comment._count.replies > 0) {
      await this.prisma.reviewComment.update({
        where: { id: commentId },
        data: { deletedAt: new Date(), content: '' },
      });
      return;
    }

    await this.prisma.reviewComment.delete({ where: { id: commentId } });
  }

  private async ensureReviewOnProduct(slug: string, reviewId: string) {
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
