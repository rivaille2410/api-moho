import {
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  UseGuards,
  Controller,
  HttpStatus,
  ParseUUIDPipe,
  UploadedFiles,
  UseInterceptors,
  ParseFilePipeBuilder,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';

import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import { QueryReturnRequestsDto } from './dto/query-return-requests.dto';
import { ReturnRequestResponseDto } from './dto/return-request-response.dto';

import {
  ApiListReturnRequests,
  ApiCreateReturnRequest,
  ApiCancelReturnRequest,
  ApiGetReturnRequestById,
  ApiAddReturnRequestImages,
} from './return-requests.swagger';
import { ReturnRequestsService } from './return-requests.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';

@ApiTags('Return Requests')
@UseGuards(JwtAuthGuard)
@Controller('return-requests')
export class ReturnRequestsController {
  constructor(private readonly returnRequestsService: ReturnRequestsService) {}

  @Get()
  @ApiListReturnRequests()
  async findMine(
    @CurrentUser() user: { id: string },
    @Query() query: QueryReturnRequestsDto,
  ) {
    const { data, meta } = await this.returnRequestsService.findAll(
      query,
      user.id,
    );
    return {
      data: data.map((item) => new ReturnRequestResponseDto(item)),
      meta,
    };
  }

  @Post()
  @ApiCreateReturnRequest()
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateReturnRequestDto,
  ) {
    const created = await this.returnRequestsService.create(user.id, dto);
    return new ReturnRequestResponseDto(created);
  }

  @Get(':id')
  @ApiGetReturnRequestById()
  async findOne(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const found = await this.returnRequestsService.findByIdForUserOrThrow(
      id,
      user.id,
    );
    return new ReturnRequestResponseDto(found);
  }

  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('files', 5))
  @ApiAddReturnRequestImages()
  async addImages(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /^image\/(jpg|jpeg|png|webp)$/ })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: true,
        }),
    )
    files: Express.Multer.File[],
  ) {
    const updated = await this.returnRequestsService.addImages(
      id,
      user.id,
      files,
    );
    return new ReturnRequestResponseDto(updated);
  }

  @Patch(':id/cancel')
  @ApiCancelReturnRequest()
  async cancel(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const updated = await this.returnRequestsService.cancel(id, user.id);
    return new ReturnRequestResponseDto(updated);
  }
}
