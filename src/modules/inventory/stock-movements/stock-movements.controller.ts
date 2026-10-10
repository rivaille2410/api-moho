import { ApiTags } from '@nestjs/swagger';
import { Get, Post, Body, Query, Controller } from '@nestjs/common';

import {
  ApiListStockMovements,
  ApiCreateStockAdjustment,
} from './stock-movements.swagger';
import { StockMovementsService } from './stock-movements.service';

import { QueryStockMovementsDto } from './dto/query-stock-movements.dto';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { StockMovementResponseDto } from './dto/stock-movement-response.dto';
import { Admin } from '@/common/decorators';

@ApiTags('Stock Movements')
@Admin()
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
