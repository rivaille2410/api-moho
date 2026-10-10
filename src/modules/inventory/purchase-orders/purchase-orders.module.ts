import { Module } from '@nestjs/common';

import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { StockMovementsModule } from '@/modules/inventory/stock-movements/stock-movements.module';

@Module({
  imports: [StockMovementsModule],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
