import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, ShipmentStatus, ShippingProvider } from '@prisma/client';

import { ShipmentWithRelations } from '../shipping.constants';

export class ShipmentOrderSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'ORD-260919-0001' })
  orderNumber: string;

  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty()
  recipientName: string;

  @ApiProperty()
  recipientPhone: string;

  @ApiProperty()
  shippingAddress: string;
}

export class ShipmentItemResponseDto {
  @ApiProperty()
  orderItemId: string;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  variantName: string;

  @ApiProperty({ type: String, nullable: true })
  thumbnailUrl: string | null;

  @ApiProperty({ description: 'Quantity in this shipment' })
  quantity: number;

  @ApiProperty({ description: 'Total quantity of this item in the order' })
  orderedQuantity: number;
}

export class ShipmentCreatorDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class ShipmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'SHP-260919-A1B2C3' })
  code: string;

  @ApiProperty({ enum: ShipmentStatus })
  status: ShipmentStatus;

  @ApiProperty({ enum: ShippingProvider })
  provider: ShippingProvider;

  @ApiProperty({ type: String, nullable: true })
  carrierCode: string | null;

  @ApiProperty({ type: String, nullable: true })
  trackingCode: string | null;

  @ApiProperty({ type: String, nullable: true })
  driverName: string | null;

  @ApiProperty({ type: String, nullable: true })
  driverPhone: string | null;

  @ApiProperty({ type: String, nullable: true })
  vehiclePlate: string | null;

  @ApiProperty({ type: Date, nullable: true })
  scheduledAt: Date | null;

  @ApiProperty({ type: Date, nullable: true })
  shippedAt: Date | null;

  @ApiProperty({ type: Date, nullable: true })
  deliveredAt: Date | null;

  @ApiProperty({ type: String, nullable: true })
  failedReason: string | null;

  @ApiProperty({ type: String, nullable: true })
  note: string | null;

  @ApiProperty({ type: ShipmentOrderSummaryDto })
  order: ShipmentOrderSummaryDto;

  @ApiProperty({ type: [ShipmentItemResponseDto] })
  items: ShipmentItemResponseDto[];

  @ApiProperty({ type: ShipmentCreatorDto, nullable: true })
  createdBy: ShipmentCreatorDto | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(shipment: ShipmentWithRelations) {
    this.id = shipment.id;
    this.code = shipment.code;
    this.status = shipment.status;
    this.provider = shipment.provider;
    this.carrierCode = shipment.carrierCode;
    this.trackingCode = shipment.trackingCode;
    this.driverName = shipment.driverName;
    this.driverPhone = shipment.driverPhone;
    this.vehiclePlate = shipment.vehiclePlate;
    this.scheduledAt = shipment.scheduledAt;
    this.shippedAt = shipment.shippedAt;
    this.deliveredAt = shipment.deliveredAt;
    this.failedReason = shipment.failedReason;
    this.note = shipment.note;
    this.order = shipment.order;
    this.items = shipment.items.map((item) => ({
      orderItemId: item.orderItemId,
      productName: item.orderItem.productName,
      variantName: item.orderItem.variantName,
      thumbnailUrl: item.orderItem.thumbnailUrl,
      quantity: item.quantity,
      orderedQuantity: item.orderItem.quantity,
    }));
    this.createdBy = shipment.createdBy;
    this.createdAt = shipment.createdAt;
    this.updatedAt = shipment.updatedAt;
  }
}
