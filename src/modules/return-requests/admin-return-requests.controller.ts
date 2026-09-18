import {
  Get,
  Body,
  Param,
  Patch,
  Query,
  UseGuards,
  Controller,
  UploadedFile,
  ParseUUIDPipe,
  UseInterceptors,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

import {
  ApiProcessRefund,
  ApiMarkItemReceived,
  ApiListReturnRequests,
  ApiRejectReturnRequest,
  ApiApproveReturnRequest,
  ApiGetReturnRequestById,
  ApiCompleteReturnRequest,
} from './return-requests.swagger';
import { ReturnRequestsService } from './return-requests.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

import { ProcessRefundDto } from './dto/process-refund.dto';
import { RejectReturnRequestDto } from './dto/reject-return-request.dto';
import { QueryReturnRequestsDto } from './dto/query-return-requests.dto';
import { ApproveReturnRequestDto } from './dto/approve-return-request.dto';
import { ReturnRequestResponseDto } from './dto/return-request-response.dto';

@ApiTags('Return Requests (Admin)')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/return-requests')
export class AdminReturnRequestsController {
  constructor(private readonly returnRequestsService: ReturnRequestsService) {}

  @Get()
  @ApiListReturnRequests()
  async findAll(@Query() query: QueryReturnRequestsDto) {
    const { data, meta } = await this.returnRequestsService.findAll(query);
    return {
      data: data.map((item) => new ReturnRequestResponseDto(item)),
      meta,
    };
  }

  @Get(':id')
  @ApiGetReturnRequestById()
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const found = await this.returnRequestsService.findByIdOrThrow(id);
    return new ReturnRequestResponseDto(found);
  }

  @Patch(':id/approve')
  @ApiApproveReturnRequest()
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveReturnRequestDto,
  ) {
    const updated = await this.returnRequestsService.approve(id, dto);
    return new ReturnRequestResponseDto(updated);
  }

  @Patch(':id/reject')
  @ApiRejectReturnRequest()
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectReturnRequestDto,
  ) {
    const updated = await this.returnRequestsService.reject(id, dto);
    return new ReturnRequestResponseDto(updated);
  }

  @Patch(':id/receive')
  @ApiMarkItemReceived()
  async markItemReceived(@Param('id', ParseUUIDPipe) id: string) {
    const updated = await this.returnRequestsService.markItemReceived(id);
    return new ReturnRequestResponseDto(updated);
  }

  @Patch(':id/refund')
  @ApiProcessRefund()
  @UseInterceptors(FileInterceptor('proofImage'))
  async processRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: { id: string },
    @Body() dto: ProcessRefundDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const updated = await this.returnRequestsService.processRefund(
      id,
      admin.id,
      dto,
      file,
    );
    return new ReturnRequestResponseDto(updated);
  }

  @Patch(':id/complete')
  @ApiCompleteReturnRequest()
  async complete(@Param('id', ParseUUIDPipe) id: string) {
    const updated = await this.returnRequestsService.complete(id);
    return new ReturnRequestResponseDto(updated);
  }
}
