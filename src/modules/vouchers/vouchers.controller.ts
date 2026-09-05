import {
  Get,
  Req,
  Res,
  Post,
  Body,
  Param,
  Patch,
  Query,
  Delete,
  HttpCode,
  UseGuards,
  HttpStatus,
  Controller,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';

import {
  ApiListVouchers,
  ApiCreateVoucher,
  ApiDeleteVoucher,
  ApiUpdateVoucher,
  ApiGetVoucherById,
  ApiValidateVoucher,
  ApiBulkDeleteVouchers,
  ApiUpdateVoucherStatus,
  ApiExportVouchers,
} from './vouchers.swagger';
import { VouchersService } from './vouchers.service';
import { Roles } from '@/modules/auth/decorators/roles.decorator';

import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

import { QueryVouchersDto } from './dto/query-vouchers.dto';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { VoucherResponseDto } from './dto/voucher-response.dto';
import { ValidateVoucherDto } from './dto/validate-voucher.dto';
import { BulkDeleteVouchersDto } from './dto/bulk-delete-vouchers.dto';
import { UpdateVoucherStatusDto } from './dto/update-voucher-status.dto';
import { VoucherListItemResponseDto } from './dto/voucher-list-item-response.dto';

@ApiTags('Vouchers')
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiListVouchers()
  async findAll(@Query() query: QueryVouchersDto) {
    const { data, meta } = await this.vouchersService.findAll(query);
    return {
      data: data.map(
        (voucher) =>
          new VoucherListItemResponseDto(
            voucher,
            this.vouchersService.computeEffectiveStatus(voucher),
          ),
      ),
      meta,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiCreateVoucher()
  async create(@Body() dto: CreateVoucherDto) {
    const voucher = await this.vouchersService.create(dto);
    return new VoucherResponseDto(
      voucher,
      this.vouchersService.computeEffectiveStatus(voucher),
    );
  }

  @Get('export')
  @ApiExportVouchers()
  async exportVouchers(@Query() query: QueryVouchersDto, @Res() res: Response) {
    const buffer = await this.vouchersService.exportToExcel(query);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="vouchers-${Date.now()}.xlsx"`,
    });
    res.send(buffer);
  }

  @Post('validate')
  @UseGuards(JwtAuthGuard)
  @ApiValidateVoucher()
  async validate(@Req() req: Request, @Body() dto: ValidateVoucherDto) {
    const userId = (req.user as { id: string }).id;
    return this.vouchersService.validateForOrder(userId, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiGetVoucherById()
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const voucher = await this.vouchersService.findByIdOrThrow(id);
    return new VoucherResponseDto(
      voucher,
      this.vouchersService.computeEffectiveStatus(voucher),
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiUpdateVoucher()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVoucherDto,
  ) {
    const updated = await this.vouchersService.update(id, dto);
    return new VoucherResponseDto(
      updated,
      this.vouchersService.computeEffectiveStatus(updated),
    );
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiUpdateVoucherStatus()
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVoucherStatusDto,
  ) {
    const updated = await this.vouchersService.updateStatus(id, dto.status);
    return new VoucherResponseDto(
      updated,
      this.vouchersService.computeEffectiveStatus(updated),
    );
  }

  @Delete('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBulkDeleteVouchers()
  async bulkRemove(@Body() dto: BulkDeleteVouchersDto) {
    return this.vouchersService.bulkRemove(dto.ids);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteVoucher()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.vouchersService.remove(id);
  }
}
