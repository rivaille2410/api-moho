import { ApiProperty } from '@nestjs/swagger';
import { Order, OrderItem, OrderStatus, PaymentMethod } from '@prisma/client';

export type OrderItemWithReview = OrderItem & { isReviewed?: boolean };

export type OrderWithItems = Order & {
  items: OrderItemWithReview[];
  user: { id: string; name: string; avatar: string | null };
};

class OrderItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() productId: string;
  @ApiProperty() variantId: string;
  @ApiProperty() productName: string;
  @ApiProperty() variantName: string;
  @ApiProperty({ required: false }) thumbnailUrl?: string;
  @ApiProperty() price: number;
  @ApiProperty() quantity: number;
  @ApiProperty() isReviewed: boolean;

  constructor(item: OrderItemWithReview) {
    this.id = item.id;
    this.productId = item.productId;
    this.variantId = item.variantId;
    this.productName = item.productName;
    this.variantName = item.variantName;
    this.thumbnailUrl = item.thumbnailUrl ?? undefined;
    this.price = item.price.toNumber();
    this.quantity = item.quantity;
    this.isReviewed = item.isReviewed ?? false;
  }
}

class OrderUserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ required: false }) avatar?: string;

  constructor(user: OrderWithItems['user']) {
    this.id = user.id;
    this.name = user.name;
    this.avatar = user.avatar ?? undefined;
  }
}

export class OrderResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() orderNumber: string;
  @ApiProperty() userId: string;
  @ApiProperty({ type: OrderUserResponseDto }) user: OrderUserResponseDto;
  @ApiProperty({ enum: OrderStatus }) status: OrderStatus;
  @ApiProperty({ enum: PaymentMethod }) paymentMethod: PaymentMethod;
  @ApiProperty() subtotal: number;
  @ApiProperty() shippingFee: number;
  @ApiProperty() discount: number;
  @ApiProperty() total: number;
  @ApiProperty() recipientName: string;
  @ApiProperty() recipientPhone: string;
  @ApiProperty() shippingAddress: string;
  @ApiProperty({ required: false }) note?: string;
  @ApiProperty({ required: false }) cancelReason?: string;
  @ApiProperty({ type: [OrderItemResponseDto] }) items: OrderItemResponseDto[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(order: OrderWithItems) {
    this.id = order.id;
    this.orderNumber = order.orderNumber;
    this.userId = order.userId;
    this.user = new OrderUserResponseDto(order.user);
    this.status = order.status;
    this.paymentMethod = order.paymentMethod;
    this.subtotal = order.subtotal.toNumber();
    this.shippingFee = order.shippingFee.toNumber();
    this.discount = order.discount.toNumber();
    this.total = order.total.toNumber();
    this.recipientName = order.recipientName;
    this.recipientPhone = order.recipientPhone;
    this.shippingAddress = order.shippingAddress;
    this.note = order.note ?? undefined;
    this.cancelReason = order.cancelReason ?? undefined;
    this.items = order.items.map((i) => new OrderItemResponseDto(i));
    this.createdAt = order.createdAt;
    this.updatedAt = order.updatedAt;
  }
}
