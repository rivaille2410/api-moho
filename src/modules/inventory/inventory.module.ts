import { Module } from '@nestjs/common';

import { SuppliersModule } from './suppliers/suppliers.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { StockMovementsModule } from './stock-movements/stock-movements.module';

// Register this single module in AppModule instead of the four sub-modules
// individually.
@Module({
  imports: [
    SuppliersModule,
    WarehousesModule,
    PurchaseOrdersModule,
    StockMovementsModule,
  ],
})
export class InventoryModule {}
