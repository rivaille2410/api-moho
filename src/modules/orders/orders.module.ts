import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({
  imports: [PrismaModule, ReviewsModule, EventEmitterModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
