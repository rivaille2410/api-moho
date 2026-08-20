import { OmitType } from '@nestjs/swagger';
import { QueryProductsDto } from './query-products.dto';

export class QueryPublicProductsDto extends OmitType(QueryProductsDto, [
  'status',
] as const) {}
