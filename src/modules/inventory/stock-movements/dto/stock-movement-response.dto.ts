import {
  Product,
  Warehouse,
  ProductImage,
  StockMovement,
  ProductVariant,
  StockMovementType,
} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { getSignedQuantity } from '../stock-movement.utils';

type StockMovementWithRelations = StockMovement & {
  variant: ProductVariant & {
    product: Product & { images: ProductImage[] };
    images: ProductImage[];
  };
  warehouse: Warehouse;
};

export class StockMovementResponseDto {
  @ApiProperty() id: string;

  @ApiProperty() variantId: string;
  @ApiProperty() productId: string;
  @ApiProperty() productName: string;
  @ApiProperty() variantName: string;
  @ApiPropertyOptional() colorName?: string | null;
  @ApiPropertyOptional() colorHex?: string | null;
  @ApiPropertyOptional() imageUrl?: string | null;

  @ApiProperty() warehouseId: string;
  @ApiProperty() warehouseName: string;

  @ApiProperty({ enum: StockMovementType }) type: StockMovementType;

  @ApiProperty({ description: 'Absolute quantity moved', example: 12 })
  quantity: number;

  @ApiProperty({
    description:
      'Signed change applied to stock: positive = in, negative = out',
    example: -12,
  })
  delta: number;

  @ApiPropertyOptional() referenceType?: string | null;
  @ApiPropertyOptional() referenceId?: string | null;
  @ApiPropertyOptional() note?: string | null;
  @ApiProperty() createdAt: Date;

  constructor(movement: StockMovementWithRelations) {
    this.id = movement.id;

    this.variantId = movement.variantId;
    this.productId = movement.variant.productId;
    this.productName = movement.variant.product.name;
    this.variantName = movement.variant.name;
    this.colorName = movement.variant.colorName;
    this.colorHex = movement.variant.colorHex;
    this.imageUrl =
      movement.variant.images[0]?.url ??
      movement.variant.product.images[0]?.url ??
      null;

    this.warehouseId = movement.warehouseId;
    this.warehouseName = movement.warehouse.name;

    this.type = movement.type;
    this.quantity = Math.abs(movement.quantity);
    this.delta = getSignedQuantity(movement.type, movement.quantity);
    this.referenceType = movement.referenceType;
    this.referenceId = movement.referenceId;
    this.note = movement.note;
    this.createdAt = movement.createdAt;
  }
}
