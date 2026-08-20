import { Type } from 'class-transformer';
import { IsArray, ValidateNested, IsOptional } from 'class-validator';
import { PartialType, OmitType, ApiPropertyOptional } from '@nestjs/swagger';

import {
  CreateProductDto,
  CreateProductMaterialDto,
} from './create-product.dto';

export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['variants'] as const),
) {
  @ApiPropertyOptional({
    type: [CreateProductMaterialDto],
    description:
      'Replaces the full materials list for this product. Omit to leave materials unchanged.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductMaterialDto)
  materials?: CreateProductMaterialDto[];
}
