import { Prisma } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

import { CartWithItems } from '../cart.types';

class CartItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() variantId: string;
  @ApiProperty() productId: string;
  @ApiProperty() productSlug: string;
  @ApiProperty() productName: string;
  @ApiProperty() sku: string;
  @ApiProperty() variantName: string;
  @ApiProperty({ nullable: true }) variantColor: string | null;
  @ApiProperty({ nullable: true }) thumbnailUrl: string | null;
  @ApiProperty() price: string;
  @ApiProperty({ nullable: true }) compareAtPrice: string | null;
  @ApiProperty() quantity: number;
  @ApiProperty() stock: number;
  @ApiProperty() lineTotal: string;
  @ApiProperty({ nullable: true }) dimensions: string | null;
  @ApiProperty({ nullable: true }) materials: string | null;

  constructor(item: CartWithItems['items'][number]) {
    const price = item.variant.priceOverride ?? item.variant.product.price;
    const { length, width, height } = item.variant.product;

    this.id = item.id;
    this.variantId = item.variantId;
    this.productId = item.variant.productId;
    this.productSlug = item.variant.product.slug;
    this.productName = item.variant.product.name;
    this.sku = item.variant.product.sku;
    this.variantName = item.variant.name;
    this.variantColor = item.variant.colorHex;
    this.thumbnailUrl =
      item.variant.images[0]?.url ??
      item.variant.product.images[0]?.url ??
      null;
    this.price = price.toString();
    this.compareAtPrice =
      item.variant.product.compareAtPrice?.toString() ?? null;
    this.quantity = item.quantity;
    this.stock = item.variant.stock;
    this.lineTotal = price.mul(item.quantity).toString();
    this.dimensions =
      length && width && height ? `${length} x ${width} x ${height} cm` : null;
    this.materials =
      item.variant.product.materials.map((m) => m.value).join(', ') || null;
  }
}

export class CartResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: [CartItemResponseDto] }) items: CartItemResponseDto[];
  @ApiProperty() totalItems: number;
  @ApiProperty() subtotal: string;

  constructor(cart: CartWithItems) {
    this.id = cart.id;
    this.items = cart.items.map((i) => new CartItemResponseDto(i));

    this.totalItems = cart.items.reduce((sum, i) => sum + i.quantity, 0);

    const subtotal = cart.items.reduce((sum, i) => {
      const price = i.variant.priceOverride ?? i.variant.product.price;
      return sum.add(price.mul(i.quantity));
    }, new Prisma.Decimal(0));
    this.subtotal = subtotal.toString();
  }
}
