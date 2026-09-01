import { ApiProperty } from '@nestjs/swagger';
import { PostListItemResponseDto } from './post-list-item-response.dto';

class PostsPaginationMetaDto {
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalItems: number;
  @ApiProperty() totalPages: number;
  @ApiProperty() hasNextPage: boolean;
  @ApiProperty() hasPreviousPage: boolean;
}

export class PaginatedPostsResponseDto {
  @ApiProperty({ type: [PostListItemResponseDto] })
  data: PostListItemResponseDto[];

  @ApiProperty({ type: PostsPaginationMetaDto })
  meta: PostsPaginationMetaDto;
}
