import {
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  Controller,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AddressResponseDto } from './dto/address-response.dto';
import {
  ApiCreateAddress,
  ApiUpdateAddress,
  ApiDeleteAddress,
  ApiListMyAddresses,
  ApiGetMyAddressById,
  ApiSetDefaultAddress,
} from './addresses.swagger';
import { AddressesService } from './addresses.service';

@ApiTags('Addresses')
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiListMyAddresses()
  async findMine(@CurrentUser('id') userId: string) {
    const addresses = await this.addressesService.findAllForUser(userId);
    return { data: addresses.map((a) => new AddressResponseDto(a)) };
  }

  @Get(':id')
  @ApiGetMyAddressById()
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const address = await this.addressesService.findByIdForUser(id, userId);
    return new AddressResponseDto(address);
  }

  @Post()
  @ApiCreateAddress()
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    const address = await this.addressesService.create(userId, dto);
    return new AddressResponseDto(address);
  }

  @Patch(':id')
  @ApiUpdateAddress()
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    const address = await this.addressesService.update(id, userId, dto);
    return new AddressResponseDto(address);
  }

  @Patch(':id/default')
  @ApiSetDefaultAddress()
  async setDefault(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const address = await this.addressesService.setDefault(id, userId);
    return new AddressResponseDto(address);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteAddress()
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.addressesService.remove(id, userId);
  }
}
