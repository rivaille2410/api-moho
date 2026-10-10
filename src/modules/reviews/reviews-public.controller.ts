import {
  Get,
  Post,
  Body,
  Param,
  Query,
  Controller,
  ParseUUIDPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  ApiListPublicReviews,
  ApiToggleReviewHelpful,
  ApiCreateCustomerReview,
  ApiGetReviewRatingSummary,
} from './reviews.swagger';
import { ReviewsService } from './reviews.service';

import { ReviewResponseDto } from './dto/review-response.dto';
import { QueryPublicReviewsDto } from './dto/query-public-reviews.dto';
import { CreateCustomerReviewDto } from './dto/create-customer-review.dto';
import { Public, OptionalAuth, CurrentUser } from '@/common/decorators';

@ApiTags('Public Reviews')
@Controller('products/:slug/reviews')
export class ReviewsPublicController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @OptionalAuth()
  @ApiListPublicReviews()
  async findAllForProduct(
    @Param('slug') slug: string,
    @Query() query: QueryPublicReviewsDto,
    @CurrentUser('id') userId?: string,
  ) {
    const { data, meta } = await this.reviewsService.findAllForProductPublic(
      slug,
      query,
    );
    return {
      data: data.map(
        (item) => new ReviewResponseDto(item.review, item.stats, userId),
      ),
      meta,
    };
  }

  @Get('summary')
  @Public()
  @ApiGetReviewRatingSummary()
  async ratingSummary(@Param('slug') slug: string) {
    return this.reviewsService.getRatingSummaryPublic(slug);
  }

  @Post()
  @ApiCreateCustomerReview()
  async createMyReview(
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCustomerReviewDto,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const { review, stats } = await this.reviewsService.createByCustomer(
      slug,
      userId,
      dto,
    );
    return new ReviewResponseDto(review, stats, userId);
  }

  @Post(':reviewId/helpful')
  @ApiToggleReviewHelpful()
  async toggleHelpful(
    @Param('slug') slug: string,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @CurrentUser('id') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const { review, stats } = await this.reviewsService.toggleHelpful(
      slug,
      reviewId,
      userId,
    );
    return new ReviewResponseDto(review, stats, userId);
  }
}
