import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export enum PublicPostSortBy {
  NEWEST = 'newest',
  POPULAR = 'popular',
}

export class QueryPublicPostsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    enum: PublicPostSortBy,
    default: PublicPostSortBy.NEWEST,
  })
  @IsOptional()
  @IsEnum(PublicPostSortBy)
  sortBy?: PublicPostSortBy;
}
