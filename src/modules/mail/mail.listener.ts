import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';

import { MailService } from './mail.service';

import type { AppConfig } from '@/config/app-config';
import {
  AppEvent,
  OrderCreatedEvent,
  OrderStatusChangedEvent,
} from '@/common/events';

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
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  @OnEvent(AppEvent.ORDER_CREATED)
  async handleOrderCreated({ order }: OrderCreatedEvent) {
    const frontendUrl = this.configService.getOrThrow('frontendUrl', {
      infer: true,
    });
    await this.mailService.sendOrderConfirmationEmail({
      to: (order.user as any).email,
      orderNumber: order.orderNumber,
      total: Number(order.total),
      orderUrl: `${frontendUrl}/orders/${order.id}`,
    });
  }

  @OnEvent(AppEvent.ORDER_STATUS_CHANGED)
  async handleOrderStatusChanged({ order }: OrderStatusChangedEvent) {
    const frontendUrl = this.configService.getOrThrow('frontendUrl', {
      infer: true,
    });
    await this.mailService.sendOrderStatusUpdateEmail({
      to: (order.user as any).email,
      orderNumber: order.orderNumber,
      status: statusLabel[order.status] ?? order.status,
      orderUrl: `${frontendUrl}/orders/${order.id}`,
    });
  }
}
