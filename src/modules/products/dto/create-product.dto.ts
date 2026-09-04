import {
  Min,
  IsIn,
  IsInt,
  IsUUID,
  IsArray,
  IsString,
  IsNumber,
  MaxLength,
  MinLength,
  IsHexColor,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductMaterialDto {
  @ApiProperty({ example: 'Tabletop', maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  label: string;

  @ApiProperty({
    example: 'Natural wood & CARB-P2 grade MDF veneer',
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  value: string;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateProductVariantDto {
  @ApiProperty({ example: 'Natural - Dark', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: '#3B2A20' })
  @IsOptional()
  @IsHexColor()
  colorHex?: string;

  @ApiPropertyOptional({ example: 'Nâu gỗ tự nhiên', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  colorName?: string;

  @ApiPropertyOptional({
    example: 790000,
    description:
      'Price override for this variant. Omit to fall back to the product base price.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceOverride?: number;

  @ApiProperty({ example: 25 })
  @IsInt()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateProductDto {
  @ApiProperty({
    example: 'MOHO Oslo 901 Wooden Sofa/Coffee/Tea Table',
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'MFSTCC101.B10', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  sku: string;

  @ApiPropertyOptional({
    example:
      'A minimalist solid-wood coffee table, ideal for compact living rooms.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 790000, description: 'Price in VND' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    example: 990000,
    description: 'Strikethrough price shown when the product is on sale',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  compareAtPrice?: number;

  @ApiPropertyOptional({ example: 95, description: 'Length in cm' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  length?: number;

  @ApiPropertyOptional({ example: 50, description: 'Width in cm' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  width?: number;

  @ApiPropertyOptional({ example: 42, description: 'Height in cm' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  height?: number;

  @ApiProperty({ example: 'b1e2c3d4-5678-90ab-cdef-1234567890ab' })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({
    enum: ProductStatus,
    example: ProductStatus.DRAFT,
    default: ProductStatus.DRAFT,
  })
  @IsOptional()
  @IsIn(Object.values(ProductStatus))
  status?: ProductStatus;

  @ApiPropertyOptional({ type: [CreateProductMaterialDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductMaterialDto)
  materials?: CreateProductMaterialDto[];

  @ApiPropertyOptional({ type: [CreateProductVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants?: CreateProductVariantDto[];
}
