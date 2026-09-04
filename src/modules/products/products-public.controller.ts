import { ApiTags } from '@nestjs/swagger';
import { Get, Query, Param, Controller } from '@nestjs/common';

import {
  ApiGetProductSlugs,
  ApiListPublicProducts,
  ApiGetRelatedProducts,
  ApiGetPublicProductBySlug,
  ApiListBestSellerProducts,
} from './products.swagger';
import { ProductsService } from './products.service';
import { Public } from '@/common/decorators/public.decorator';

import { ProductResponseDto } from './dto/product-response.dto';
import { GetProductSlugsDto } from './dto/get-product-slugs.dto';
import { GetAvailableColorsDto } from './dto/get-available-colors.dto';
import { QueryPublicProductsDto } from './dto/query-public-products.dto';
import { ProductSlugResponseDto } from './dto/product-slug-response.dto';

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

  @Get('slugs')
  @ApiGetProductSlugs()
  async findSlugs(@Query() query: GetProductSlugsDto) {
    const products = await this.productsService.findSlugsByIds(query.ids);
    return products.map((p) => new ProductSlugResponseDto(p));
  }

  // NOTE: must stay above the ':slug' route below — otherwise Nest will
  // match GET /public/products/colors as findBySlug({ slug: 'colors' }).
  @Get('colors')
  async getAvailableColors(@Query() query: GetAvailableColorsDto) {
    return this.productsService.getAvailableColorsPublic(query.categoryId);
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
