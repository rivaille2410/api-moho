import { OmitType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
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
] as const) {
  @ApiPropertyOptional({
    enum: PublicProductSortBy,
    default: PublicProductSortBy.NEWEST,
  })
  @IsOptional()
  @IsEnum(PublicProductSortBy)
  sortBy?: PublicProductSortBy;
}
