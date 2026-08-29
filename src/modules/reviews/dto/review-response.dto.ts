import {
  User,
  Review,
  ReviewImage,
  ReviewHelpful,
  ProductVariant,
} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ReviewAuthorDto {
  @ApiPropertyOptional({
    nullable: true,
    description:
      'Id of the linked user, null for a guest/admin-authored review',
  })
  userId: string | null;

  @ApiProperty({
    description: 'Display name (snapshot taken at creation time)',
  })
  name: string;

  @ApiPropertyOptional({ nullable: true })
  avatarUrl: string | null;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiProperty({
    description: 'Whether this review is linked to a real user account',
  })
  isRegisteredUser: boolean;

  @ApiProperty({
    description: 'Years since the author joined, 0 for guest reviews',
  })
  memberSinceYears: number;

  @ApiProperty({
    description: 'Total number of reviews written by this author',
  })
  reviewCount: number;

  @ApiProperty({
    description:
      'Total "helpful" votes received across all of this author\'s reviews',
  })
  thanksCount: number;
}

class ReviewVariantInfoDto {
  @ApiProperty() label: string;
  @ApiProperty() value: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Hex color code for rendering a color swatch, e.g. "#1A1A1A"',
  })
  colorHex: string | null;
}

class ReviewProductDto {
  @ApiProperty() name: string;
  @ApiProperty() slug: string;

  @ApiPropertyOptional({ nullable: true })
  thumbnailUrl: string | null;
}

export interface AuthorStats {
  memberSinceYears: number;
  reviewCount: number;
  thanksCount: number;
}

export type ReviewWithRelations = Review & {
  user: User | null;
  images: ReviewImage[];
  helpfulVotes: ReviewHelpful[];
  variant: ProductVariant | null;
  product: { name: string; slug: string; images: { url: string }[] };
  _count?: { comments: number };
};

export class ReviewResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() productId: string;
  @ApiProperty({ type: ReviewProductDto }) product: ReviewProductDto;
  @ApiProperty({ minimum: 1, maximum: 5 }) rating: number;
  @ApiProperty({ type: ReviewAuthorDto }) author: ReviewAuthorDto;
  @ApiProperty() content: string;
  @ApiProperty({ type: [String] }) images: string[];
  @ApiProperty() verifiedPurchase: boolean;

  @ApiPropertyOptional({ type: [ReviewVariantInfoDto] })
  variantInfo?: ReviewVariantInfoDto[];

  @ApiPropertyOptional({ nullable: true })
  usedForLabel: string | null;

  @ApiProperty()
  helpfulCount: number;

  @ApiProperty({
    description:
      'Whether the currently authenticated user has marked this review as helpful. Always false for guests / unauthenticated requests.',
  })
  isHelpfulByCurrentUser: boolean;

  @ApiProperty({
    description:
      'Total comments on this review, including replies (counts top-level comments + replies rows, soft-deleted comments included since they still occupy a row in the thread).',
  })
  commentCount: number;

  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(
    review: ReviewWithRelations,
    stats?: AuthorStats,
    currentUserId?: string,
  ) {
    this.id = review.id;
    this.productId = review.productId;
    this.product = {
      name: review.product.name,
      slug: review.product.slug,
      thumbnailUrl: review.product.images[0]?.url ?? null,
    };
    this.rating = review.rating;
    this.author = {
      userId: review.userId,
      name: review.authorName,
      avatarUrl: review.user?.avatar ?? null,
      email: review.user?.email ?? null,
      isRegisteredUser: !!review.userId,
      memberSinceYears: stats?.memberSinceYears ?? 0,
      reviewCount: stats?.reviewCount ?? 0,
      thanksCount: stats?.thanksCount ?? 0,
    };
    this.content = review.content;
    this.images = review.images.map((img) => img.url);
    this.verifiedPurchase = review.verifiedPurchase;
    this.variantInfo = review.variant
      ? [
          {
            label: 'Màu',
            value: review.variantLabel ?? review.variant.name,
            colorHex: review.variant.colorHex ?? null,
          },
        ]
      : undefined;
    this.usedForLabel = review.usedForLabel ?? null;
    this.helpfulCount = review.helpfulVotes?.length ?? 0;
    this.isHelpfulByCurrentUser = currentUserId
      ? (review.helpfulVotes ?? []).some(
          (vote) => vote.userId === currentUserId,
        )
      : false;
    this.commentCount = review._count?.comments ?? 0;
    this.createdAt = review.createdAt;
    this.updatedAt = review.updatedAt;
  }
}
