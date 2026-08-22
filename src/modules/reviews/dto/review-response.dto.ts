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
}

class ReviewProductDto {
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
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
  product: { name: string; slug: string };
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
    description: 'Not supported yet — always 0 until a comment module exists',
  })
  commentCount: number;

  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(review: ReviewWithRelations, stats?: AuthorStats) {
    this.id = review.id;
    this.productId = review.productId;
    this.product = {
      name: review.product.name,
      slug: review.product.slug,
    };
    this.rating = review.rating;
    this.author = {
      userId: review.userId,
      name: review.authorName,
      avatarUrl: review.user?.avatar ?? null,
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
            label: 'Variant',
            value: review.variantLabel ?? review.variant.name,
          },
        ]
      : undefined;
    this.usedForLabel = review.usedForLabel ?? null;
    this.helpfulCount = review.helpfulVotes?.length ?? 0;
    this.commentCount = 0;
    this.createdAt = review.createdAt;
    this.updatedAt = review.updatedAt;
  }
}
