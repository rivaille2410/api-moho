import {
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  UseGuards,
  Controller,
  ParseUUIDPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

import { CreateCommentDto } from './dto/create-comment.dto';
import { QueryCommentsDto } from './dto/query-comments.dto';
import { CommentResponseDto } from './dto/comment-response.dto';

import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

import {
  ApiListComments,
  ApiCreateComment,
  ApiRemoveComment,
} from './comments.swagger';

@ApiTags('Review Comments')
@Controller('products/:slug/reviews/:reviewId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @Public()
  @ApiListComments()
  async findAll(
    @Param('slug') slug: string,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Query() query: QueryCommentsDto,
  ) {
    const { data, meta } = await this.commentsService.findAllForReview(
      slug,
      reviewId,
      query,
    );
    return {
      data: data.map((comment) => new CommentResponseDto(comment)),
      meta,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiCreateComment()
  async create(
    @Param('slug') slug: string,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const comment = await this.commentsService.create(
      slug,
      reviewId,
      userId,
      dto,
    );
    return new CommentResponseDto(comment);
  }

  @Delete(':commentId')
  @UseGuards(JwtAuthGuard)
  @ApiRemoveComment()
  async remove(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    await this.commentsService.remove(commentId, userId, role === Role.ADMIN);
    return { success: true };
  }
}
