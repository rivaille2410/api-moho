import { Module } from '@nestjs/common';

import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsPublicController } from './reviews-public.controller';

import { PrismaModule } from '@/prisma/prisma.module';
import { CloudinaryModule } from '@/common/cloudinary/cloudinary.module';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  controllers: [ReviewsController, ReviewsPublicController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
