import {
  Get,
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
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

import {
  ApiListCategories,
  ApiCreateCategory,
  ApiUpdateCategory,
  ApiDeleteCategory,
  ApiGetCategoryTree,
  ApiGetCategoryById,
} from './categories.swagger';
import { CategoriesService } from './categories.service';

import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { BulkDeleteCategoriesDto } from './dto/bulk-delete-categories.dto';

@ApiTags('Categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
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
