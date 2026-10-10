import { Module } from '@nestjs/common';

import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductsPublicController } from './products-public.controller';

@Module({
  controllers: [ProductsController, ProductsPublicController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
