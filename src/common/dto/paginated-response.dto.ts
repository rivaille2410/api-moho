import { Type as ClassType } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from './pagination-meta.dto';

export class PaginatedResponseDto<T> {
  data: T[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export function createPaginatedResponseDto<T>(itemClass: ClassType<T>) {
  class GenericPaginatedResponseDto {
    @ApiProperty({ type: [itemClass] })
    data: T[];

    @ApiProperty({ type: PaginationMetaDto })
    meta: PaginationMetaDto;
  }

  return GenericPaginatedResponseDto;
}
