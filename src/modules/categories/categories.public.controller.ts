import { ApiTags } from '@nestjs/swagger';
import { Get, Query, Controller } from '@nestjs/common';

import { CategoriesService } from './categories.service';
import { ApiListPublicCategories } from './categories.swagger';

import { QueryPublicCategoriesDto } from './dto/query-public-categories.dto';
import { PublicCategoryResponseDto } from './dto/public-category-response.dto';
import { Public } from '@/common/decorators';

@Public()
@ApiTags('Public Categories')
@Controller('public/categories')
export class CategoriesPublicController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiListPublicCategories()
  async findAllPublic(@Query() query: QueryPublicCategoriesDto) {
    const categories = await this.categoriesService.findAllPublic(query);
    return categories.map((c) => new PublicCategoryResponseDto(c));
  }
}
