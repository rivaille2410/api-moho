import {
  Get,
  Res,
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

import { QueryVouchersDto } from './dto/query-vouchers.dto';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { VoucherResponseDto } from './dto/voucher-response.dto';
import { ValidateVoucherDto } from './dto/validate-voucher.dto';
import { BulkDeleteVouchersDto } from './dto/bulk-delete-vouchers.dto';
import { UpdateVoucherStatusDto } from './dto/update-voucher-status.dto';
import { VoucherListItemResponseDto } from './dto/voucher-list-item-response.dto';
import { Admin, CurrentUser } from '@/common/decorators';
import { sendExcelFile, excelFilename } from '@/common/utils';

@ApiTags('Vouchers')
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get()
  @Admin()
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
  @Admin()
  @ApiCreateVoucher()
  async create(@Body() dto: CreateVoucherDto) {
    const voucher = await this.vouchersService.create(dto);
    return new VoucherResponseDto(
      voucher,
      this.vouchersService.computeEffectiveStatus(voucher),
    );
  }

  @Get('export')
  @Admin()
  @ApiExportVouchers()
  async exportVouchers(@Query() query: QueryVouchersDto, @Res() res: Response) {
    const buffer = await this.vouchersService.exportToExcel(query);
    sendExcelFile(res, excelFilename('vouchers'), buffer);
  }

  @Post('validate')
  @ApiValidateVoucher()
  async validate(
    @CurrentUser('id') userId: string,
    @Body() dto: ValidateVoucherDto,
  ) {
    return this.vouchersService.validateForOrder(userId, dto);
  }

  @Get(':id')
  @Admin()
  @ApiGetVoucherById()
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const voucher = await this.vouchersService.findByIdOrThrow(id);
    return new VoucherResponseDto(
      voucher,
      this.vouchersService.computeEffectiveStatus(voucher),
    );
  }

  @Patch(':id')
  @Admin()
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
  @Admin()
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
  @Admin()
  @ApiBulkDeleteVouchers()
  async bulkRemove(@Body() dto: BulkDeleteVouchersDto) {
    return this.vouchersService.bulkRemove(dto.ids);
  }

  @Delete(':id')
  @Admin()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteVoucher()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.vouchersService.remove(id);
  }
}
