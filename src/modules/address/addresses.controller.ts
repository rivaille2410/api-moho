import {
  Get,
  Req,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  UseGuards,
  Controller,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

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

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@ApiTags('Addresses')
@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiListMyAddresses()
  async findMine(@Req() req: { user: { id: string } }) {
    const addresses = await this.addressesService.findAllForUser(req.user.id);
    return { data: addresses.map((a) => new AddressResponseDto(a)) };
  }

  @Get(':id')
  @ApiGetMyAddressById()
  async findOne(
    @Req() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const address = await this.addressesService.findByIdForUser(
      id,
      req.user.id,
    );
    return new AddressResponseDto(address);
  }

  @Post()
  @ApiCreateAddress()
  async create(
    @Req() req: { user: { id: string } },
    @Body() dto: CreateAddressDto,
  ) {
    const address = await this.addressesService.create(req.user.id, dto);
    return new AddressResponseDto(address);
  }

  @Patch(':id')
  @ApiUpdateAddress()
  async update(
    @Req() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    const address = await this.addressesService.update(id, req.user.id, dto);
    return new AddressResponseDto(address);
  }

  @Patch(':id/default')
  @ApiSetDefaultAddress()
  async setDefault(
    @Req() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const address = await this.addressesService.setDefault(id, req.user.id);
    return new AddressResponseDto(address);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteAddress()
  async remove(
    @Req() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.addressesService.remove(id, req.user.id);
  }
}
