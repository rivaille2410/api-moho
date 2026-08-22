import {
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Controller,
  ParseUUIDPipe,
  UploadedFiles,
  UseInterceptors,
  ParseFilePipeBuilder,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';

import { QueryReviewsDto } from './dto/query-reviews.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';

import {
  ApiListReviews,
  ApiCreateReview,
  ApiDeleteReview,
  ApiUpdateReview,
  ApiGetReviewById,
  ApiAddReviewImages,
  ApiRemoveReviewImage,
} from './reviews.swagger';
import { ReviewsService } from './reviews.service';
import { Roles } from '@/modules/auth/decorators/roles.decorator';

import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@ApiTags('Reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiListReviews()
  async findAll(@Query() query: QueryReviewsDto) {
    const { data, meta } = await this.reviewsService.findAll(query);
    return {
      data: data.map(
        ({ review, stats }) => new ReviewResponseDto(review, stats),
      ),
      meta,
    };
  }

  @Post()
  @ApiCreateReview()
  async create(@Body() dto: CreateReviewDto) {
    const { review, stats } = await this.reviewsService.create(dto);
    return new ReviewResponseDto(review, stats);
  }

  @Get(':id')
  @ApiGetReviewById()
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const { review, stats } = await this.reviewsService.findByIdOrThrow(id);
    return new ReviewResponseDto(review, stats);
  }

  @Patch(':id')
  @ApiUpdateReview()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    const { review, stats } = await this.reviewsService.update(id, dto);
    return new ReviewResponseDto(review, stats);
  }

  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('files', 6))
  @ApiAddReviewImages()
  async addImages(
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
    const { review, stats } = await this.reviewsService.addImages(id, files);
    return new ReviewResponseDto(review, stats);
  }

  @Delete(':id/images/:imageId')
  @ApiRemoveReviewImage()
  async removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    const { review, stats } = await this.reviewsService.removeImage(
      id,
      imageId,
    );
    return new ReviewResponseDto(review, stats);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteReview()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.reviewsService.remove(id);
  }
}
