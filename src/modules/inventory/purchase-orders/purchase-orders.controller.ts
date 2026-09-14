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
import { ApiTags } from '@nestjs/swagger';

import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

import {
  ApiListPurchaseOrders,
  ApiCreatePurchaseOrder,
  ApiGetPurchaseOrderById,
  ApiReceivePurchaseOrder,
  ApiUpdatePurchaseOrderStatus,
} from './purchase-orders.swagger';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';

import { QueryPurchaseOrdersDto } from './dto/query-purchase-orders.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { PurchaseOrderResponseDto } from './dto/purchase-order-response.dto';
import { UpdatePurchaseOrderStatusDto } from './dto/update-purchase-order-status.dto';

@ApiTags('Purchase Orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  @ApiListPurchaseOrders()
  async findAll(@Query() query: QueryPurchaseOrdersDto) {
    const { data, meta } = await this.purchaseOrdersService.findAll(query);
    return { data: data.map((po) => new PurchaseOrderResponseDto(po)), meta };
  }

  @Post()
  @ApiCreatePurchaseOrder()
  async create(
    @Body() dto: CreatePurchaseOrderDto,
    @CurrentUser('id') userId?: string,
  ) {
    const po = await this.purchaseOrdersService.create(dto, userId);
    return new PurchaseOrderResponseDto(po);
  }

  @Get(':id')
  @ApiGetPurchaseOrderById()
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const po = await this.purchaseOrdersService.findByIdOrThrow(id);
    return new PurchaseOrderResponseDto(po);
  }

  @Patch(':id/status')
  @ApiUpdatePurchaseOrderStatus()
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseOrderStatusDto,
  ) {
    const po = await this.purchaseOrdersService.updateStatus(id, dto);
    return new PurchaseOrderResponseDto(po);
  }

  @Post(':id/receive')
  @ApiReceivePurchaseOrder()
  async receive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceivePurchaseOrderDto,
    @CurrentUser('id') userId?: string,
  ) {
    const po = await this.purchaseOrdersService.receive(id, dto, userId);
    return new PurchaseOrderResponseDto(po);
  }
}
