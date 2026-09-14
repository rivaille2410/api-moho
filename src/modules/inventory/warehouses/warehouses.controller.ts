import {
  Get,
  Post,
  Body,
  Param,
  Patch,
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
  ApiListWarehouses,
  ApiCreateWarehouse,
  ApiUpdateWarehouse,
  ApiDeleteWarehouse,
  ApiGetWarehouseById,
  ApiBulkDeleteWarehouses,
} from './warehouses.swagger';
import { WarehousesService } from './warehouses.service';
import { Roles } from '@/modules/auth/decorators/roles.decorator';

import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehouseResponseDto } from './dto/warehouse-response.dto';
import { BulkDeleteWarehousesDto } from './dto/bulk-delete-warehouses.dto';

@ApiTags('Warehouses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  @ApiListWarehouses()
  async findAll() {
    const warehouses = await this.warehousesService.findAll();
    return warehouses.map((w) => new WarehouseResponseDto(w));
  }

  @Post('bulk-delete')
  @ApiBulkDeleteWarehouses()
  async bulkRemove(@Body() dto: BulkDeleteWarehousesDto) {
    return this.warehousesService.bulkRemove(dto);
  }

  @Get(':id')
  @ApiGetWarehouseById()
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const warehouse = await this.warehousesService.findByIdOrThrow(id);
    return new WarehouseResponseDto(warehouse);
  }

  @Post()
  @ApiCreateWarehouse()
  async create(@Body() dto: CreateWarehouseDto) {
    const warehouse = await this.warehousesService.create(dto);
    return new WarehouseResponseDto(warehouse);
  }

  @Patch(':id')
  @ApiUpdateWarehouse()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWarehouseDto,
  ) {
    const updated = await this.warehousesService.update(id, dto);
    return new WarehouseResponseDto(updated);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteWarehouse()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.warehousesService.remove(id);
  }
}
