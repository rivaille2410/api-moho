import {
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Controller,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  ApiListPublicReviews,
  ApiCreateCustomerReview,
  ApiGetReviewRatingSummary,
} from './reviews.swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

import { ReviewResponseDto } from './dto/review-response.dto';
import { QueryPublicReviewsDto } from './dto/query-public-reviews.dto';
import { CreateCustomerReviewDto } from './dto/create-customer-review.dto';

@ApiTags('Public Reviews')
@Public()
@Controller('products/:slug/reviews')
export class ReviewsPublicController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiListPublicReviews()
  async findAllForProduct(
    @Param('slug') slug: string,
    @Query() query: QueryPublicReviewsDto,
  ) {
    const { data, meta } = await this.reviewsService.findAllForProductPublic(
      slug,
      query,
    );
    return {
      data: data.map((item) => new ReviewResponseDto(item.review, item.stats)),
      meta,
    };
  }

  @Get('summary')
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
    const { review, stats } = await this.reviewsService.createByCustomer(
      slug,
      userId,
      dto,
    );
    return new ReviewResponseDto(review, stats);
  }
}
