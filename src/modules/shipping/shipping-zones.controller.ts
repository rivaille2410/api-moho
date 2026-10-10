import {
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
import { ApiTags } from '@nestjs/swagger';

import {
  ApiListShippingZones,
  ApiCreateShippingZone,
  ApiDeleteShippingZone,
  ApiUpdateShippingZone,
  ApiGetShippingZoneById,
} from './shipping.swagger';
import { ShippingZonesService } from './shipping-zones.service';

import { QueryShippingZonesDto } from './dto/query-shipping-zones.dto';
import { CreateShippingZoneDto } from './dto/create-shipping-zone.dto';
import { UpdateShippingZoneDto } from './dto/update-shipping-zone.dto';
import { ShippingZoneResponseDto } from './dto/shipping-zone-response.dto';
import { Admin } from '@/common/decorators';

@ApiTags('Shipping Zones')
@Admin()
@Controller('shipping/zones')
export class ShippingZonesController {
  constructor(private readonly zonesService: ShippingZonesService) {}

  @Get()
  @ApiListShippingZones()
  async findAll(@Query() query: QueryShippingZonesDto) {
    const { data, meta } = await this.zonesService.findAll(query);
    return {
      data: data.map((zone) => new ShippingZoneResponseDto(zone)),
      meta,
    };
  }

  @Post()
  @ApiCreateShippingZone()
  async create(@Body() dto: CreateShippingZoneDto) {
    const zone = await this.zonesService.create(dto);
    return new ShippingZoneResponseDto(zone);
  }

  @Get(':id')
  @ApiGetShippingZoneById()
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const zone = await this.zonesService.findByIdOrThrow(id);
    return new ShippingZoneResponseDto(zone);
  }

  @Patch(':id')
  @ApiUpdateShippingZone()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShippingZoneDto,
  ) {
    const zone = await this.zonesService.update(id, dto);
    return new ShippingZoneResponseDto(zone);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteShippingZone()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.zonesService.remove(id);
  }
}
