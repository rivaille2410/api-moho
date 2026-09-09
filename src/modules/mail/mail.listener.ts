import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';

import { MailService } from './mail.service';

import {
  OrderCreatedEvent,
  OrderStatusChangedEvent,
} from '@/common/events/order.events';
import { AppEvent } from '@/common/events/event-names';

const statusLabel: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã huỷ',
};

@Injectable()
export class MailListener {
  constructor(
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  @OnEvent(AppEvent.ORDER_CREATED)
  async handleOrderCreated({ order }: OrderCreatedEvent) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    await this.mailService.sendOrderConfirmationEmail({
      to: (order.user as any).email,
      orderNumber: order.orderNumber,
      total: Number(order.total),
      orderUrl: `${frontendUrl}/orders/${order.id}`,
    });
  }

  @OnEvent(AppEvent.ORDER_STATUS_CHANGED)
  async handleOrderStatusChanged({ order }: OrderStatusChangedEvent) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    await this.mailService.sendOrderStatusUpdateEmail({
      to: (order.user as any).email,
      orderNumber: order.orderNumber,
      status: statusLabel[order.status] ?? order.status,
      orderUrl: `${frontendUrl}/orders/${order.id}`,
    });
  }
}
