import { Role } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { Get, Post, Body, Query, UseGuards, Controller } from '@nestjs/common';

import {
  ApiListStockMovements,
  ApiCreateStockAdjustment,
} from './stock-movements.swagger';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { StockMovementsService } from './stock-movements.service';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

import { QueryStockMovementsDto } from './dto/query-stock-movements.dto';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { StockMovementResponseDto } from './dto/stock-movement-response.dto';

@ApiTags('Stock Movements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Get()
  @ApiListStockMovements()
  async findAll(@Query() query: QueryStockMovementsDto) {
    return this.stockMovementsService.findAll(query);
  }

  @Post('adjustments')
  @ApiCreateStockAdjustment()
  async createAdjustment(@Body() dto: CreateStockAdjustmentDto) {
    const movement = await this.stockMovementsService.createAdjustment(dto);
    return new StockMovementResponseDto(movement);
  }
}
