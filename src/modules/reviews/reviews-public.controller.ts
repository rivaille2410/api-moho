import {
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Controller,
  ParseUUIDPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  ApiListPublicReviews,
  ApiCreateCustomerReview,
  ApiGetReviewRatingSummary,
  ApiToggleReviewHelpful,
} from './reviews.swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { OptionalAuth } from '@/common/decorators/optional-auth.decorator';

import { ReviewResponseDto } from './dto/review-response.dto';
import { QueryPublicReviewsDto } from './dto/query-public-reviews.dto';
import { CreateCustomerReviewDto } from './dto/create-customer-review.dto';

@ApiTags('Public Reviews')
@Controller('products/:slug/reviews')
export class ReviewsPublicController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
