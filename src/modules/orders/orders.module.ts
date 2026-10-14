import { Module } from '@nestjs/common';
import { forwardRef } from '@nestjs/common';

import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ReviewsModule } from '../reviews/reviews.module';
import { ShippingModule } from '../shipping/shipping.module';
import { VouchersModule } from '../vouchers/vouchers.module';

@Module({
  imports: [ReviewsModule, forwardRef(() => ShippingModule), VouchersModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
