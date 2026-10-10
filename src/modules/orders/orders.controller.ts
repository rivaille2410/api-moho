import {
  Get,
  Res,
  Post,
  Body,
  Param,
  Patch,
  Query,
  Controller,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';

import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import {
  ApiListOrders,
  ApiCreateOrder,
  ApiGetOrderById,
  ApiListMyOrders,
  ApiExportOrders,
  ApiGetMyOrderById,
  ApiUpdateOrderStatus,
} from './orders.swagger';
import { OrdersService } from './orders.service';
import { Admin, CurrentUser } from '@/common/decorators';
import { sendExcelFile, excelFilename } from '@/common/utils';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Admin()
  @ApiListOrders()
  async findAll(@Query() query: QueryOrdersDto) {
    const { data, meta } = await this.ordersService.findAll(query);
    return { data: data.map((o) => new OrderResponseDto(o)), meta };
  }

  @Get('export')
  @Admin()
  @ApiExportOrders()
  async exportOrders(@Query() query: QueryOrdersDto, @Res() res: Response) {
    const buffer = await this.ordersService.exportToExcel(query);
    sendExcelFile(res, excelFilename('orders'), buffer);
  }

  @Get(':id')
  @Admin()
  @ApiGetOrderById()
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const order = await this.ordersService.findByIdOrThrow(id);
    return new OrderResponseDto(order);
  }

  @Patch(':id/status')
  @Admin()
  @ApiUpdateOrderStatus()
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser('id') userId: string,
  ) {
    const order = await this.ordersService.updateStatus(id, dto, userId);
    return new OrderResponseDto(order);
  }

  @Post()
  @ApiCreateOrder()
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateOrderDto) {
    const order = await this.ordersService.create(userId, dto);
    return new OrderResponseDto(order);
  }

  @Get('me/list')
  @ApiListMyOrders()
  async findMine(
    @CurrentUser('id') userId: string,
    @Query() query: QueryOrdersDto,
  ) {
    const { data, meta } = await this.ordersService.findAllForUser(
      userId,
      query,
    );
    return { data: data.map((o) => new OrderResponseDto(o)), meta };
  }

  @Get('me/:id')
  @ApiGetMyOrderById()
  async findMyOrder(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const order = await this.ordersService.findByIdForUser(id, userId);
    return new OrderResponseDto(order);
  }
}
