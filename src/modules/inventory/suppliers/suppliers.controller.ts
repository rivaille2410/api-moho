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
  ApiListSuppliers,
  ApiCreateSupplier,
  ApiDeleteSupplier,
  ApiUpdateSupplier,
  ApiGetSupplierById,
  ApiBulkDeleteSuppliers,
} from './suppliers.swagger';
import { SuppliersService } from './suppliers.service';
import { Roles } from '@/modules/auth/decorators/roles.decorator';

import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

import { QuerySuppliersDto } from './dto/query-suppliers.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierResponseDto } from './dto/supplier-response.dto';
import { BulkDeleteSuppliersDto } from './dto/bulk-delete-suppliers.dto';

@ApiTags('Suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @ApiListSuppliers()
  async findAll(@Query() query: QuerySuppliersDto) {
    const { data, meta } = await this.suppliersService.findAll(query);
    return { data: data.map((s) => new SupplierResponseDto(s)), meta };
  }

  @Post()
  @ApiCreateSupplier()
  async create(@Body() dto: CreateSupplierDto) {
    const supplier = await this.suppliersService.create(dto);
    return new SupplierResponseDto(supplier);
  }

  @Post('bulk-delete')
  @ApiBulkDeleteSuppliers()
  async bulkRemove(@Body() dto: BulkDeleteSuppliersDto) {
    return this.suppliersService.bulkRemove(dto);
  }

  @Get(':id')
  @ApiGetSupplierById()
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const supplier = await this.suppliersService.findByIdOrThrow(id);
    return new SupplierResponseDto(supplier);
  }

  @Patch(':id')
  @ApiUpdateSupplier()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    const updated = await this.suppliersService.update(id, dto);
    return new SupplierResponseDto(updated);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteSupplier()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.suppliersService.remove(id);
  }
}
