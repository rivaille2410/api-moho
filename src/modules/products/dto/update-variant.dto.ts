import { PartialType } from '@nestjs/swagger';
import { CreateProductVariantDto } from './create-product.dto';

export class UpdateVariantDto extends PartialType(CreateProductVariantDto) {}
