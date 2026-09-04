import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { CategoriesPublicController } from './categories.public.controller';

@Module({
  controllers: [CategoriesController, CategoriesPublicController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
