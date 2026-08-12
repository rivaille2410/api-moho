import { ApiProperty } from '@nestjs/swagger';

import { UserResponseDto } from './user-response.dto';
import { PaginationMetaDto } from './pagination-meta.dto';

export class PaginatedUsersResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  data: UserResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
