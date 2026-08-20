import { ApiTags } from '@nestjs/swagger';
import { Get, Query, Param, Controller } from '@nestjs/common';

import {
  ApiListPublicProducts,
  ApiGetRelatedProducts,
  ApiGetPublicProductBySlug,
  ApiListBestSellerProducts,
} from './products.swagger';
import { ProductsService } from './products.service';
import { Public } from '@/common/decorators/public.decorator';

import { ProductResponseDto } from './dto/product-response.dto';
import { QueryPublicProductsDto } from './dto/query-public-products.dto';

@ApiTags('Public Products')
@Public()
@Controller('public/products')
export class ProductsPublicController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiListPublicProducts()
  async findAll(@Query() query: QueryPublicProductsDto) {
    const { data, meta } = await this.productsService.findAllPublic(query);
    return {
      data: data.map((product) => new ProductResponseDto(product)),
      meta,
    };
  }

  @Get('best-sellers')
  @ApiListBestSellerProducts()
  async findBestSellers(@Query() query: QueryPublicProductsDto) {
    const { data, meta } =
      await this.productsService.findBestSellersPublic(query);
    return {
      data: data.map((product) => new ProductResponseDto(product)),
      meta,
    };
  }

  @Get(':slug/related')
  @ApiGetRelatedProducts()
  async findRelated(
    @Param('slug') slug: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    const { data, meta } = await this.productsService.findRelatedProducts(
      slug,
      cursor,
      limit ? Number(limit) : undefined,
    );
    return {
      data: data.map((product) => new ProductResponseDto(product)),
      meta,
    };
  }

  @Get(':slug')
  @ApiGetPublicProductBySlug()
  async findBySlug(@Param('slug') slug: string) {
    const product = await this.productsService.findBySlugPublic(slug);
    return new ProductResponseDto(product);
  }
}
