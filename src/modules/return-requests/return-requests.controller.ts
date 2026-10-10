import {
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
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
import { CurrentUser } from '@/common/decorators';

@ApiTags('Return Requests')
@Controller('return-requests')
export class ReturnRequestsController {
  constructor(private readonly returnRequestsService: ReturnRequestsService) {}

  @Get()
  @ApiListReturnRequests()
  async findMine(
    @CurrentUser('id') userId: string,
    @Query() query: QueryReturnRequestsDto,
  ) {
    const { data, meta } = await this.returnRequestsService.findAll(
      query,
      userId,
    );
    return {
      data: data.map((item) => new ReturnRequestResponseDto(item)),
      meta,
    };
  }

  @Post()
  @ApiCreateReturnRequest()
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReturnRequestDto,
  ) {
    const created = await this.returnRequestsService.create(userId, dto);
    return new ReturnRequestResponseDto(created);
  }

  @Get(':id')
  @ApiGetReturnRequestById()
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const found = await this.returnRequestsService.findByIdForUserOrThrow(
      id,
      userId,
    );
    return new ReturnRequestResponseDto(found);
  }

  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('files', 5))
  @ApiAddReturnRequestImages()
  async addImages(
    @CurrentUser('id') userId: string,
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
      userId,
      files,
    );
    return new ReturnRequestResponseDto(updated);
  }

  @Patch(':id/cancel')
  @ApiCancelReturnRequest()
  async cancel(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const updated = await this.returnRequestsService.cancel(id, userId);
    return new ReturnRequestResponseDto(updated);
  }
}
