import {
  Get,
  Res,
  Post,
  Body,
  Param,
  Patch,
  Query,
  Delete,
  HttpCode,
  UseGuards,
  HttpStatus,
  Controller,
  ParseUUIDPipe,
  UploadedFiles,
  UseInterceptors,
  ParseFilePipeBuilder,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';

import {
  ApiListProducts,
  ApiCreateProduct,
  ApiDeleteProduct,
  ApiUpdateProduct,
  ApiExportProducts,
  ApiGetProductById,
  ApiAddProductImage,
  ApiRemoveProductImage,
  ApiBulkDeleteProducts,
  ApiUpdateProductStatus,
} from './products.swagger';
import { ProductsService } from './products.service';
import { Roles } from '@/modules/auth/decorators/roles.decorator';

import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

import { QueryProductsDto } from './dto/query-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { BulkDeleteProductsDto } from './dto/builk-delete-products.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';

@ApiTags('Products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiListProducts()
  async findAll(@Query() query: QueryProductsDto) {
    const { data, meta } = await this.productsService.findAll(query);
    return {
      data: data.map((product) => new ProductResponseDto(product)),
      meta,
    };
  }

  @Post()
  @ApiCreateProduct()
  async create(@Body() dto: CreateProductDto) {
    const product = await this.productsService.create(dto);
    return new ProductResponseDto(product);
  }

  @Get('export')
  @ApiExportProducts()
  async exportProducts(@Query() query: QueryProductsDto, @Res() res: Response) {
    const buffer = await this.productsService.exportToExcel(query);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="products-${Date.now()}.xlsx"`,
    });
    res.send(buffer);
  }

  @Get(':id')
  @ApiGetProductById()
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const product = await this.productsService.findByIdOrThrow(id);
    return new ProductResponseDto(product);
  }

  @Patch(':id')
  @ApiUpdateProduct()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    const updated = await this.productsService.update(id, dto);
    return new ProductResponseDto(updated);
  }

  @Patch(':id/status')
  @ApiUpdateProductStatus()
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductStatusDto,
  ) {
    const updated = await this.productsService.updateStatus(id, dto.status);
    return new ProductResponseDto(updated);
  }

  @Post(':id/variants')
  @HttpCode(HttpStatus.CREATED)
  async addVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateVariantDto,
  ) {
    const updated = await this.productsService.addVariant(id, dto);
    return new ProductResponseDto(updated);
  }

  @Patch(':id/variants/:variantId')
  async updateVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: UpdateVariantDto,
  ) {
    const updated = await this.productsService.updateVariant(
      id,
      variantId,
      dto,
    );
    return new ProductResponseDto(updated);
  }

  @Delete(':id/variants/:variantId')
  async removeVariant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
  ) {
    const updated = await this.productsService.removeVariant(id, variantId);
    return new ProductResponseDto(updated);
  }

  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiAddProductImage()
  async addImages(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('variantId') variantId: string | undefined,
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /^image\/(jpg|jpeg|png|webp)$/ })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: true,
        }),
    )
    files: Express.Multer.File[],
  ) {
    const updated = await this.productsService.addImages(id, files, variantId);
    return new ProductResponseDto(updated);
  }

  @Delete(':id/images/:imageId')
  @ApiRemoveProductImage()
  async removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    const updated = await this.productsService.removeImage(id, imageId);
    return new ProductResponseDto(updated);
  }

  @Delete('bulk')
  @ApiBulkDeleteProducts()
  async bulkRemove(@Body() dto: BulkDeleteProductsDto) {
    return this.productsService.bulkRemove(dto.ids);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteProduct()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.productsService.remove(id);
  }
}
