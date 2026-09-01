import { ApiTags } from '@nestjs/swagger';
import { Get, Query, Param, Controller } from '@nestjs/common';

import { PostResponseDto } from './dto/post-response.dto';
import { QueryPublicPostsDto } from './dto/query-public-posts.dto';
import { PostListItemResponseDto } from './dto/post-list-item-response.dto';

import { PostsService } from './posts.service';
import { Public } from '@/common/decorators/public.decorator';
import { ApiListPublicPosts, ApiGetPublicPostBySlug } from './posts.swagger';

@ApiTags('Public Posts')
@Public()
@Controller('public/posts')
export class PostsPublicController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @ApiListPublicPosts()
  async findAll(@Query() query: QueryPublicPostsDto) {
    const { data, meta } = await this.postsService.findAllPublic(query);
    return {
      data: data.map((post) => new PostListItemResponseDto(post)),
      meta,
    };
  }

  @Get(':slug')
  @ApiGetPublicPostBySlug()
  async findBySlug(@Param('slug') slug: string) {
    const post = await this.postsService.findBySlugPublic(slug);
    return new PostResponseDto(post);
  }
}
