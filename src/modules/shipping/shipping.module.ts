import { Module } from '@nestjs/common';

import { OrdersModule } from '../orders/orders.module';
import { ShipmentsService } from './shipments.service';
import { ShippingFeeService } from './shipping-fee.service';
import { ShipmentsController } from './shipments.controller';
import { ShippingZonesService } from './shipping-zones.service';
import { ShippingFeeController } from './shipping-fee.controller';
import { ShippingZonesController } from './shipping-zones.controller';

@Module({
  imports: [OrdersModule],
  controllers: [
    ShippingZonesController,
    ShippingFeeController,
    ShipmentsController,
  ],
  providers: [ShippingZonesService, ShippingFeeService, ShipmentsService],
  exports: [ShippingFeeService],
})
export class ShippingModule {}
