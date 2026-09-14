import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';

import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { StockMovementsModule } from '@/modules/inventory/stock-movements/stock-movements.module';

@Module({
  imports: [PrismaModule, StockMovementsModule],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
