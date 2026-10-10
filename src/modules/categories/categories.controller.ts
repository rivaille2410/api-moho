import {
  Res,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  Delete,
  HttpCode,
  HttpStatus,
  Controller,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';

import {
  ApiListCategories,
  ApiCreateCategory,
  ApiUpdateCategory,
  ApiDeleteCategory,
  ApiGetCategoryTree,
  ApiGetCategoryById,
  ApiExportCategories,
} from './categories.swagger';
import { CategoriesService } from './categories.service';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { BulkDeleteCategoriesDto } from './dto/bulk-delete-categories.dto';
import { Admin } from '@/common/decorators';
import { sendExcelFile, excelFilename } from '@/common/utils';

@ApiTags('Categories')
@Admin()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiListCategories()
  async findAll(@Query() query: QueryCategoriesDto) {
    const categories = await this.categoriesService.findAll(query);
    return categories.map((category) => new CategoryResponseDto(category));
  }

  @Get('tree')
  @ApiGetCategoryTree()
  async findTree() {
    return this.categoriesService.findTree();
  }

  @Delete('bulk')
  @HttpCode(HttpStatus.OK)
  async removeMany(@Body() dto: BulkDeleteCategoriesDto) {
    return this.categoriesService.removeMany(dto.ids);
  }

  @Get(':id')
  @ApiGetCategoryById()
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const category = await this.categoriesService.findByIdOrThrow(id);
    return new CategoryResponseDto(category);
  }

  @Post()
  @ApiCreateCategory()
  async create(@Body() dto: CreateCategoryDto) {
    const category = await this.categoriesService.create(dto);
    return new CategoryResponseDto(category);
  }

  @Get('export')
  @ApiExportCategories()
  async exportCategories(
    @Query() query: QueryCategoriesDto,
    @Res() res: Response,
  ) {
    const buffer = await this.categoriesService.exportToExcel(query);
    sendExcelFile(res, excelFilename('categories'), buffer);
  }

  @Patch(':id')
  @ApiUpdateCategory()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const updated = await this.categoriesService.update(id, dto);
    return new CategoryResponseDto(updated);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteCategory()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.categoriesService.remove(id);
  }
}
