import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '@/common/dto';
import { PostListItemResponseDto } from './post-list-item-response.dto';

export class PaginatedPostsResponseDto {
  @ApiProperty({ type: [PostListItemResponseDto] })
  data: PostListItemResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
