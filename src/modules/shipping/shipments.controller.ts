import {
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  UseGuards,
  Controller,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';

import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

import {
  ApiListShipments,
  ApiCreateShipment,
  ApiUpdateShipment,
  ApiGetShipmentById,
  ApiUpdateShipmentStatus,
} from './shipping.swagger';
import { ShipmentsService } from './shipments.service';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';

import { QueryShipmentsDto } from './dto/query-shipments.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { ShipmentResponseDto } from './dto/shipment-response.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { QueryShippableOrdersDto } from './dto/query-shippable-orders.dto';
import { ShippableOrderResponseDto } from './dto/shippable-order-response.dto';

@ApiTags('Shipments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Get()
  @ApiListShipments()
  async findAll(@Query() query: QueryShipmentsDto) {
    const { data, meta } = await this.shipmentsService.findAll(query);
    return {
      data: data.map((shipment) => new ShipmentResponseDto(shipment)),
      meta,
    };
  }

  @Get('shippable-orders')
  @ApiOperation({
    summary: 'List orders that can still get a new shipment',
    description:
      'Orders in a shippable status with at least one item not yet assigned to an active shipment. Each item carries its remaining quantity.',
  })
  @ApiOkResponse({ type: [ShippableOrderResponseDto] })
  async findShippableOrders(@Query() query: QueryShippableOrdersDto) {
    const orders = await this.shipmentsService.findShippableOrders(query);
    return orders.map((order) => new ShippableOrderResponseDto(order));
  }

  @Post()
  @ApiCreateShipment()
  async create(
    @Body() dto: CreateShipmentDto,
    @CurrentUser('id') userId: string,
  ) {
    const shipment = await this.shipmentsService.create(dto, userId);
    return new ShipmentResponseDto(shipment);
  }

  @Get(':id')
  @ApiGetShipmentById()
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const shipment = await this.shipmentsService.findByIdOrThrow(id);
    return new ShipmentResponseDto(shipment);
  }

  @Patch(':id')
  @ApiUpdateShipment()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShipmentDto,
  ) {
    const updated = await this.shipmentsService.update(id, dto);
    return new ShipmentResponseDto(updated);
  }

  @Patch(':id/status')
  @ApiUpdateShipmentStatus()
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShipmentStatusDto,
    @CurrentUser('id') userId: string,
  ) {
    const updated = await this.shipmentsService.updateStatus(id, dto, userId);
    return new ShipmentResponseDto(updated);
  }
}
