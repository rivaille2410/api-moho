import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';

import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({
  imports: [PrismaModule, ReviewsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
