import {
  Order,
  Payment,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ConfirmationType,
} from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export type OrderItemWithReview = OrderItem & { isReviewed?: boolean };

export type OrderWithItems = Order & {
  items: OrderItemWithReview[];
  user: { id: string; name: string; avatar: string | null };
  payments: Payment[];
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

class PaymentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: PaymentMethod }) method: PaymentMethod;
  @ApiProperty({ enum: ConfirmationType }) confirmationType: ConfirmationType;
  @ApiProperty({ enum: PaymentStatus }) status: PaymentStatus;
  @ApiProperty() amount: number;
  @ApiProperty({ required: false }) confirmedAt?: Date;
  @ApiProperty({ required: false }) proofImageUrl?: string;

  constructor(payment: Payment) {
    this.id = payment.id;
    this.method = payment.method;
    this.confirmationType = payment.confirmationType;
    this.status = payment.status;
    this.amount = payment.amount.toNumber();
    this.confirmedAt = payment.confirmedAt ?? undefined;
    this.proofImageUrl = payment.proofImageUrl ?? undefined;
  }
}

export class OrderResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() orderNumber: string;
  @ApiProperty() userId: string;
  @ApiProperty({ type: OrderUserResponseDto }) user: OrderUserResponseDto;
  @ApiProperty({ enum: OrderStatus }) status: OrderStatus;
  @ApiProperty({ type: PaymentResponseDto, required: false })
  payment?: PaymentResponseDto;
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
    this.payment = order.payments?.[0]
      ? new PaymentResponseDto(order.payments[0])
      : undefined;
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
