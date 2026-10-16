import { OmitType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { QueryProductsDto } from './query-products.dto';

export enum PublicProductSortBy {
  NEWEST = 'newest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  BEST_SELLING = 'best_selling',
}

export class QueryPublicProductsDto extends OmitType(QueryProductsDto, [
  'status',
  'page',
] as const) {
  @ApiPropertyOptional({ description: 'Opaque cursor returned as meta.nextCursor' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    enum: PublicProductSortBy,
    default: PublicProductSortBy.NEWEST,
  })
  @IsOptional()
  @IsEnum(PublicProductSortBy)
  sortBy?: PublicProductSortBy;
}
