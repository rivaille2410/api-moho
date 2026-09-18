import {
  Prisma,
  ReturnReason,
  ReturnStatus,
  RefundMethod,
} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

type ReturnRequestWithRelations = Prisma.ReturnRequestGetPayload<{
  include: {
    items: {
      include: {
        orderItem: {
          include: {
            product: { select: { slug: true } };
            variant: { select: { colorHex: true; colorName: true } };
          };
        };
      };
    };
    images: true;
    order: { select: { orderNumber: true } };
    user: { select: { id: true; name: true; email: true; avatar: true } };
  };
}>;

export class ReturnRequestResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() orderId: string;
  @ApiProperty() orderNumber: string;
  @ApiProperty() userId: string;
  @ApiProperty() customerName: string;
  @ApiProperty() customerEmail: string;
  @ApiPropertyOptional() customerAvatar?: string | null;
  @ApiProperty({ enum: ReturnReason }) reason: ReturnReason;
  @ApiPropertyOptional() reasonNote?: string | null;
  @ApiProperty({ enum: ReturnStatus }) status: ReturnStatus;
  @ApiProperty() refundAmount: string;
  @ApiPropertyOptional({ enum: RefundMethod })
  refundMethod?: RefundMethod | null;
  @ApiPropertyOptional() refundBankName?: string | null;
  @ApiPropertyOptional() refundBankAccountNumber?: string | null;
  @ApiPropertyOptional() refundBankAccountHolder?: string | null;
  @ApiPropertyOptional() refundProofImageUrl?: string | null;
  @ApiPropertyOptional() adminNote?: string | null;
  @ApiPropertyOptional() rejectReason?: string | null;
  @ApiProperty() items: {
    id: string;
    orderItemId: string;
    productSlug: string;
    productName: string;
    variantName: string;
    thumbnailUrl: string | null;
    colorHex: string | null;
    colorName: string | null;
    quantity: number;
    unitPrice: string;
  }[];
  @ApiProperty({ type: [String] }) images: string[];
  @ApiPropertyOptional() approvedAt?: Date | null;
  @ApiPropertyOptional() itemReceivedAt?: Date | null;
  @ApiPropertyOptional() refundedAt?: Date | null;
  @ApiPropertyOptional() completedAt?: Date | null;
  @ApiPropertyOptional() cancelledAt?: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(entity: ReturnRequestWithRelations) {
    this.id = entity.id;
    this.code = entity.code;
    this.orderId = entity.orderId;
    this.orderNumber = entity.order.orderNumber;
    this.userId = entity.userId;
    this.customerName = entity.user.name;
    this.customerEmail = entity.user.email;
    this.customerAvatar = entity.user.avatar;
    this.reason = entity.reason;
    this.reasonNote = entity.reasonNote;
    this.status = entity.status;
    this.refundAmount = entity.refundAmount.toString();
    this.refundMethod = entity.refundMethod;
    this.refundBankName = entity.refundBankName;
    this.refundBankAccountNumber = entity.refundBankAccountNumber;
    this.refundBankAccountHolder = entity.refundBankAccountHolder;
    this.refundProofImageUrl = entity.refundProofImageUrl;
    this.adminNote = entity.adminNote;
    this.rejectReason = entity.rejectReason;
    this.items = entity.items.map((item) => ({
      id: item.id,
      orderItemId: item.orderItemId,
      productSlug: item.orderItem.product.slug,
      productName: item.orderItem.productName,
      variantName: item.orderItem.variantName,
      thumbnailUrl: item.orderItem.thumbnailUrl,
      colorHex: item.orderItem.variant.colorHex,
      colorName: item.orderItem.variant.colorName,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toString(),
    }));
    this.images = entity.images.map((img) => img.url);
    this.approvedAt = entity.approvedAt;
    this.itemReceivedAt = entity.itemReceivedAt;
    this.refundedAt = entity.refundedAt;
    this.completedAt = entity.completedAt;
    this.cancelledAt = entity.cancelledAt;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
  }
}
