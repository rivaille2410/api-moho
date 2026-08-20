import { ProductStatus } from '@prisma/client';
import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ProductImageResponseDto {
  @Expose()
  @ApiProperty({ example: 'e1f2a3b4-5678-90cd-ef12-345678901cde' })
  id: string;

  @Expose()
  @ApiProperty({
    example:
      'https://res.cloudinary.com/demo/image/upload/v1/products/oslo-901-1.jpg',
  })
  url: string;

  @Expose()
  @ApiProperty({ example: 0 })
  sortOrder: number;

  @Expose()
  @ApiProperty({ example: true })
  isThumbnail: boolean;
}

class ProductMaterialResponseDto {
  @Expose()
  @ApiProperty({ example: 'f2a3b4c5-6789-01de-f234-56789012def0' })
  id: string;

  @Expose()
  @ApiProperty({ example: 'Tabletop' })
  label: string;

  @Expose()
  @ApiProperty({ example: 'Natural wood & CARB-P2 grade MDF veneer' })
  value: string;

  @Expose()
  @ApiProperty({ example: 0 })
  sortOrder: number;
}

class ProductVariantResponseDto {
  @Expose()
  @ApiProperty({ example: 'a3b4c5d6-7890-12ef-3456-7890123def01' })
  id: string;

  @Expose()
  @ApiProperty({ example: 'Natural - Dark' })
  name: string;

  @Expose()
  @ApiPropertyOptional({ example: '#3B2A20' })
  colorHex: string | null;

  @Expose()
  @ApiPropertyOptional({ example: 790000 })
  priceOverride: number | null;

  @Expose()
  @ApiProperty({ example: 25 })
  stock: number;

  @Expose()
  @ApiProperty({ example: 0 })
  sortOrder: number;

  @Expose()
  @ApiProperty({ type: [ProductImageResponseDto] })
  @Type(() => ProductImageResponseDto)
  images: ProductImageResponseDto[];
}

@Exclude()
export class ProductResponseDto {
  @Expose()
  @ApiProperty({ example: 'b4c5d6e7-8901-23f0-4567-890123ef0123' })
  id: string;

  @Expose()
  @ApiProperty({ example: 'MOHO Oslo 901 Wooden Sofa/Coffee/Tea Table' })
  name: string;

  @Expose()
  @ApiProperty({ example: 'moho-oslo-901-wooden-sofa-coffee-tea-table' })
  slug: string;

  @Expose()
  @ApiProperty({ example: 'MFSTCC101.B10' })
  sku: string;

  @Expose()
  @ApiPropertyOptional({
    example:
      'A minimalist solid-wood coffee table, ideal for compact living rooms.',
  })
  description: string | null;

  @Expose()
  @ApiProperty({ example: 790000, description: 'Price in VND' })
  price: number;

  @Expose()
  @ApiPropertyOptional({ example: 990000 })
  compareAtPrice: number | null;

  @Expose()
  @ApiPropertyOptional({ example: 95, description: 'Length in cm' })
  length: number | null;

  @Expose()
  @ApiPropertyOptional({ example: 50, description: 'Width in cm' })
  width: number | null;

  @Expose()
  @ApiPropertyOptional({ example: 42, description: 'Height in cm' })
  height: number | null;

  @Expose()
  @ApiProperty({ example: 'c5d6e7f8-9012-34f1-5678-901234f01234' })
  categoryId: string;

  @Expose()
  @ApiProperty({ enum: ProductStatus, example: ProductStatus.ACTIVE })
  status: ProductStatus;

  @Expose()
  @ApiProperty({ example: 969 })
  soldCount: number;

  @Expose()
  @ApiProperty({
    example: 43,
    description: 'Sum of stock across all variants',
  })
  totalStock: number;

  @Expose()
  @ApiProperty({ type: [ProductMaterialResponseDto] })
  @Type(() => ProductMaterialResponseDto)
  materials: ProductMaterialResponseDto[];

  @Expose()
  @ApiProperty({ type: [ProductImageResponseDto] })
  @Type(() => ProductImageResponseDto)
  images: ProductImageResponseDto[];

  @Expose()
  @ApiProperty({ type: [ProductVariantResponseDto] })
  @Type(() => ProductVariantResponseDto)
  variants: ProductVariantResponseDto[];

  @Expose()
  @ApiProperty({ example: '2026-08-14T09:30:00.000Z' })
  createdAt: Date;

  @Expose()
  @ApiProperty({ example: '2026-08-14T09:30:00.000Z' })
  updatedAt: Date;

  constructor(product: {
    id: string;
    name: string;
    slug: string;
    sku: string;
    description: string | null;
    price: { toNumber(): number };
    compareAtPrice: { toNumber(): number } | null;
    length: { toNumber(): number } | null;
    width: { toNumber(): number } | null;
    height: { toNumber(): number } | null;
    categoryId: string;
    status: ProductStatus;
    soldCount: number;
    totalStock: number;
    materials: ProductMaterialResponseDto[];
    images: ProductImageResponseDto[];
    variants: (Omit<ProductVariantResponseDto, 'priceOverride'> & {
      priceOverride: { toNumber(): number } | null;
    })[];
    createdAt: Date;
    updatedAt: Date;
  }) {
    Object.assign(this, product, {
      price: product.price.toNumber(),
      compareAtPrice: product.compareAtPrice?.toNumber() ?? null,
      length: product.length?.toNumber() ?? null,
      width: product.width?.toNumber() ?? null,
      height: product.height?.toNumber() ?? null,
      variants: product.variants.map((v) => ({
        ...v,
        priceOverride: v.priceOverride?.toNumber() ?? null,
      })),
    });
  }
}
