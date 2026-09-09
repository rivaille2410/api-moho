import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from '@prisma/client';
import { Injectable, Logger } from '@nestjs/common';

import { NotificationsService } from './notifications.service';

import {
  OrderCreatedEvent,
  OrderStatusChangedEvent,
} from '@/common/events/order.events';
import { AppEvent } from '@/common/events/event-names';
import { ReviewCreatedEvent } from '@/common/events/review.events';
import { CommentCreatedEvent } from '@/common/events/comment.events';
import { ProductLowStockEvent } from '@/common/events/product.events';
import { PaymentAwaitingConfirmEvent } from '@/common/events/payment.events';

const statusLabel: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã huỷ',
};

@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent(AppEvent.ORDER_CREATED)
  async handleOrderCreated({ order }: OrderCreatedEvent) {
    await this.safeCreate({
      type: NotificationType.ORDER_CREATED,
      title: 'Đơn hàng mới',
      message: `Đơn ${order.orderNumber} vừa được tạo, chờ xác nhận.`,
      link: `/dashboard/orders/${order.id}`,
      metadata: { orderId: order.id, orderNumber: order.orderNumber },
      target: { audience: 'ADMIN' },
    });
  }

  @OnEvent(AppEvent.ORDER_STATUS_CHANGED)
  async handleOrderStatusChanged({
    order,
    previousStatus,
  }: OrderStatusChangedEvent) {
    const results = await Promise.allSettled([
      this.notificationsService.create({
        type: NotificationType.ORDER_STATUS_CHANGED,
        title: 'Cập nhật trạng thái đơn hàng',
        message: `Đơn ${order.orderNumber}: ${statusLabel[previousStatus]} → ${statusLabel[order.status]}`,
        link: `/dashboard/orders/${order.id}`,
        metadata: {
          orderId: order.id,
          from: previousStatus,
          to: order.status,
        },
        target: { audience: 'ADMIN' },
      }),
      this.notificationsService.create({
        type: NotificationType.ORDER_STATUS_CHANGED,
        title: 'Đơn hàng của bạn đã được cập nhật',
        message: `Đơn ${order.orderNumber}: ${statusLabel[order.status]}`,
        link: `/dashboard/orders/${order.id}`,
        metadata: { orderId: order.id, status: order.status },
        target: { audience: 'USER', userId: order.userId },
      }),
    ]);

    results.forEach((result) => {
      if (result.status === 'rejected') {
        this.logger.error(
          'Failed to create order status notification',
          result.reason,
        );
      }
    });
  }

  @OnEvent(AppEvent.PAYMENT_AWAITING_CONFIRM)
  async handlePaymentAwaitingConfirm(event: PaymentAwaitingConfirmEvent) {
    await this.safeCreate({
      type: NotificationType.PAYMENT_AWAITING_CONFIRM,
      title: 'Thanh toán cần xác nhận',
      message: `Đơn ${event.orderNumber} có chuyển khoản ${event.amount.toLocaleString('vi-VN')}đ đang chờ xác nhận.`,
      link: `/dashboard/orders/${event.orderId}`,
      metadata: { paymentId: event.paymentId, orderId: event.orderId },
      target: { audience: 'ADMIN' },
    });
  }

  @OnEvent(AppEvent.PRODUCT_LOW_STOCK)
  async handleLowStock(event: ProductLowStockEvent) {
    await this.safeCreate({
      type: NotificationType.PRODUCT_LOW_STOCK,
      title: 'Sản phẩm sắp hết hàng',
      message: `"${event.productName} - ${event.variantName}" chỉ còn ${event.currentStock} sản phẩm.`,
      link: `/dashboard/products/${event.productId}`,
      metadata: { variantId: event.variantId, stock: event.currentStock },
      target: { audience: 'ADMIN' },
    });
  }

  @OnEvent(AppEvent.REVIEW_CREATED)
  async handleReviewCreated(event: ReviewCreatedEvent) {
    await this.safeCreate({
      type: NotificationType.REVIEW_CREATED,
      title: 'Đánh giá mới',
      message: `${event.authorName} đánh giá ${event.rating}★ cho "${event.productName}".`,
      link: `/dashboard/products/${event.productId}`,
      metadata: { reviewId: event.reviewId, productId: event.productId },
      target: { audience: 'ADMIN' },
    });
  }

  @OnEvent(AppEvent.COMMENT_CREATED)
  async handleCommentCreated(event: CommentCreatedEvent) {
    const targets = new Set<string>();

    if (event.parentCommentOwnerUserId) {
      targets.add(event.parentCommentOwnerUserId);
    }
    if (event.reviewOwnerUserId) {
      targets.add(event.reviewOwnerUserId);
    }
    targets.delete(event.authorUserId);

    if (targets.size === 0) return;

    const message = event.isReply
      ? `${event.authorName} đã phản hồi bình luận của bạn.`
      : `${event.authorName} đã bình luận vào đánh giá của bạn.`;

    const results = await Promise.allSettled(
      [...targets].map((userId) =>
        this.notificationsService.create({
          type: NotificationType.COMMENT_CREATED,
          title: event.isReply ? 'Có phản hồi mới' : 'Có bình luận mới',
          message,
          link: `/dashboard/products/${event.productSlug}?reviewId=${event.reviewId}`,
          metadata: { commentId: event.commentId, reviewId: event.reviewId },
          target: { audience: 'USER', userId },
        }),
      ),
    );

    results.forEach((result) => {
      if (result.status === 'rejected') {
        this.logger.error(
          'Failed to create comment notification',
          result.reason,
        );
      }
    });
  }

  private async safeCreate(
    input: Parameters<NotificationsService['create']>[0],
  ) {
    try {
      await this.notificationsService.create(input);
    } catch (err) {
      this.logger.error(`Failed to create notification (${input.type})`, err);
    }
  }
}
