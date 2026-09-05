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
  UseGuards,
  HttpStatus,
  Controller,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';

import {
  ApiListPosts,
  ApiCreatePost,
  ApiDeletePost,
  ApiUpdatePost,
  ApiGetPostById,
  ApiBulkDeletePosts,
  ApiUpdatePostStatus,
  ApiExportPosts,
} from './posts.swagger';
import { PostsService } from './posts.service';
import { Roles } from '@/modules/auth/decorators/roles.decorator';

import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

import { QueryPostsDto } from './dto/query-posts.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostResponseDto } from './dto/post-response.dto';
import { BulkDeletePostsDto } from './dto/bulk-delete-posts.dto';
import { UpdatePostStatusDto } from './dto/update-post-status.dto';
import { PostListItemResponseDto } from './dto/post-list-item-response.dto';

@ApiTags('Posts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @ApiListPosts()
  async findAll(@Query() query: QueryPostsDto) {
    const { data, meta } = await this.postsService.findAll(query);
    return {
      data: data.map((post) => new PostListItemResponseDto(post)),
      meta,
    };
  }

  @Post()
  @ApiCreatePost()
  async create(@Body() dto: CreatePostDto) {
    const post = await this.postsService.create(dto);
    return new PostResponseDto(post);
  }

  @Get('export')
  @ApiExportPosts()
  async exportPosts(@Query() query: QueryPostsDto, @Res() res: Response) {
    const buffer = await this.postsService.exportToExcel(query);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="posts-${Date.now()}.xlsx"`,
    });
    res.send(buffer);
  }

  @Get(':id')
  @ApiGetPostById()
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const post = await this.postsService.findByIdOrThrow(id);
    return new PostResponseDto(post);
  }

  @Patch(':id')
  @ApiUpdatePost()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePostDto,
  ) {
    const updated = await this.postsService.update(id, dto);
    return new PostResponseDto(updated);
  }

  @Patch(':id/status')
  @ApiUpdatePostStatus()
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePostStatusDto,
  ) {
    const updated = await this.postsService.updateStatus(id, dto.status);
    return new PostResponseDto(updated);
  }

  @Delete('bulk')
  @ApiBulkDeletePosts()
  async bulkRemove(@Body() dto: BulkDeletePostsDto) {
    return this.postsService.bulkRemove(dto.ids);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeletePost()
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.postsService.remove(id);
  }
}
