import { Prisma, PurchaseOrderStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

type PurchaseOrderWithItems = Prisma.PurchaseOrderGetPayload<{
  include: {
    items: {
      include: {
        variant: {
          select: {
            id: true;
            name: true;
            colorName: true;
            colorHex: true;
            product: { select: { id: true; name: true; sku: true } };
          };
        };
      };
    };
    supplier: { select: { id: true; name: true } };
    warehouse: { select: { id: true; name: true } };
  };
}>;

class PurchaseOrderVariantProductDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() sku: string;
}

class PurchaseOrderVariantDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional({ nullable: true }) colorName: string | null;
  @ApiPropertyOptional({ nullable: true }) colorHex: string | null;
  @ApiProperty({ type: PurchaseOrderVariantProductDto })
  product: PurchaseOrderVariantProductDto;
}

class PurchaseOrderItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() variantId: string;
  @ApiPropertyOptional({ type: PurchaseOrderVariantDto })
  variant?: PurchaseOrderVariantDto;
  @ApiProperty() quantityOrdered: number;
  @ApiProperty() quantityReceived: number;
  @ApiProperty() unitCost: string;
}

class PurchaseOrderRefDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
}

export class PurchaseOrderResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty({ type: PurchaseOrderRefDto }) supplier: PurchaseOrderRefDto;
  @ApiProperty({ type: PurchaseOrderRefDto }) warehouse: PurchaseOrderRefDto;
  @ApiProperty({ enum: PurchaseOrderStatus }) status: PurchaseOrderStatus;
  @ApiPropertyOptional() note?: string | null;
  @ApiPropertyOptional() expectedAt?: Date | null;
  @ApiPropertyOptional() receivedAt?: Date | null;
  @ApiProperty({ type: [PurchaseOrderItemResponseDto] })
  items: PurchaseOrderItemResponseDto[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(po: PurchaseOrderWithItems) {
    this.id = po.id;
    this.code = po.code;
    this.supplier = { id: po.supplier.id, name: po.supplier.name };
    this.warehouse = { id: po.warehouse.id, name: po.warehouse.name };
    this.status = po.status;
    this.note = po.note;
    this.expectedAt = po.expectedAt;
    this.receivedAt = po.receivedAt;
    this.items = po.items.map((item) => ({
      id: item.id,
      variantId: item.variantId,
      variant: item.variant
        ? {
            id: item.variant.id,
            name: item.variant.name,
            colorName: item.variant.colorName,
            colorHex: item.variant.colorHex,
            product: {
              id: item.variant.product.id,
              name: item.variant.product.name,
              sku: item.variant.product.sku,
            },
          }
        : undefined,
      quantityOrdered: item.quantityOrdered,
      quantityReceived: item.quantityReceived,
      unitCost: item.unitCost.toString(),
    }));
    this.createdAt = po.createdAt;
    this.updatedAt = po.updatedAt;
  }
}
