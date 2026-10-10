import { Module } from '@nestjs/common';

import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsPublicController } from './reviews-public.controller';

@Module({
  controllers: [ReviewsController, ReviewsPublicController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
