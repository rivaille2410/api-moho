import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class CategoryResponseDto {
  @Expose()
  @ApiProperty({ example: 'b1e2c3d4-5678-90ab-cdef-1234567890ab' })
  id: string;

  @Expose()
  @ApiProperty({ example: 'Tables' })
  name: string;

  @Expose()
  @ApiProperty({ example: 'tables' })
  slug: string;

  @Expose()
  @ApiProperty({
    example: 'a0b1c2d3-4567-89ab-cdef-0123456789ab',
    nullable: true,
  })
  parentId: string | null;

  @Expose()
  @ApiProperty({
    example: 12,
    description: 'Number of products in this category',
  })
  productCount: number;

  @Expose()
  @ApiProperty({ example: 3, description: 'Number of direct subcategories' })
  childrenCount: number;

  @Expose()
  @ApiProperty({ example: '2026-08-14T09:30:00.000Z' })
  createdAt: Date;

  @Expose()
  @ApiProperty({ example: '2026-08-14T09:30:00.000Z' })
  updatedAt: Date;

  constructor(category: {
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
    createdAt: Date;
    updatedAt: Date;
    _count?: { products: number; children: number };
  }) {
    Object.assign(this, category, {
      productCount: category._count?.products ?? 0,
      childrenCount: category._count?.children ?? 0,
    });
  }
}
