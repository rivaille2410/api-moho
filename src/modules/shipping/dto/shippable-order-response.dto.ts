import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

import { ShippableOrder } from '../shipping.constants';

export class ShippableOrderItemDto {
  @ApiProperty()
  orderItemId: string;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  variantName: string;

  @ApiProperty({ type: String, nullable: true })
  thumbnailUrl: string | null;

  @ApiProperty({ description: 'Total quantity in the order' })
  orderedQuantity: number;

  @ApiProperty({
    description: 'Quantity not yet assigned to any active shipment',
  })
  remainingQuantity: number;
}

export class ShippableOrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orderNumber: string;

  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty()
  recipientName: string;

  @ApiProperty()
  recipientPhone: string;

  @ApiProperty()
  shippingAddress: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({
    type: [ShippableOrderItemDto],
    description: 'Only items that still have remaining quantity',
  })
  items: ShippableOrderItemDto[];

  constructor(order: ShippableOrder) {
    this.id = order.id;
    this.orderNumber = order.orderNumber;
    this.status = order.status;
    this.recipientName = order.recipientName;
    this.recipientPhone = order.recipientPhone;
    this.shippingAddress = order.shippingAddress;
    this.createdAt = order.createdAt;
    this.items = order.items
      .map((item) => ({
        orderItemId: item.id,
        productName: item.productName,
        variantName: item.variantName,
        thumbnailUrl: item.thumbnailUrl,
        orderedQuantity: item.quantity,
        remainingQuantity:
          item.quantity -
          item.shipmentItems.reduce((sum, s) => sum + s.quantity, 0),
      }))
      .filter((item) => item.remainingQuantity > 0);
  }
}
