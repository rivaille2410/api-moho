import {
  Get,
  Req,
  Res,
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
import { Roles } from '@/modules/auth/decorators/roles.decorator';

import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiListOrders()
  async findAll(@Query() query: QueryOrdersDto) {
    const { data, meta } = await this.ordersService.findAll(query);
    return { data: data.map((o) => new OrderResponseDto(o)), meta };
  }

  @Get('export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiExportOrders()
  async exportOrders(@Query() query: QueryOrdersDto, @Res() res: Response) {
    const buffer = await this.ordersService.exportToExcel(query);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="orders-${Date.now()}.xlsx"`,
    });
    res.send(buffer);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiGetOrderById()
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const order = await this.ordersService.findByIdOrThrow(id);
    return new OrderResponseDto(order);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiUpdateOrderStatus()
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const order = await this.ordersService.updateStatus(id, dto);
    return new OrderResponseDto(order);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiCreateOrder()
  async create(
    @Req() req: { user: { id: string } },
    @Body() dto: CreateOrderDto,
  ) {
    const order = await this.ordersService.create(req.user.id, dto);
    return new OrderResponseDto(order);
  }

  @Get('me/list')
  @UseGuards(JwtAuthGuard)
  @ApiListMyOrders()
  async findMine(
    @Req() req: { user: { id: string } },
    @Query() query: QueryOrdersDto,
  ) {
    const { data, meta } = await this.ordersService.findAllForUser(
      req.user.id,
      query,
    );
    return { data: data.map((o) => new OrderResponseDto(o)), meta };
  }

  @Get('me/:id')
  @UseGuards(JwtAuthGuard)
  @ApiGetMyOrderById()
  async findMyOrder(
    @Req() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const order = await this.ordersService.findByIdForUser(id, req.user.id);
    return new OrderResponseDto(order);
  }
}
