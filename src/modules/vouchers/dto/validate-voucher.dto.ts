import {
  Min,
  IsArray,
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidateVoucherDto {
  @ApiProperty({ example: 'SUMMER2026' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 5000000, description: 'Cart subtotal in VND' })
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Category IDs present in cart, used to validate CATEGORY-scoped vouchers',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'Product IDs present in cart, used to validate PRODUCT-scoped vouchers',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];
}
