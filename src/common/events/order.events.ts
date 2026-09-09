import { OrderStatus } from '@prisma/client';
import { OrderWithItems } from '@/modules/orders/dto/order-response.dto';

export class OrderCreatedEvent {
  constructor(public readonly order: OrderWithItems) {}
}

export class OrderStatusChangedEvent {
  constructor(
    public readonly order: OrderWithItems,
    public readonly previousStatus: OrderStatus,
  ) {}
}
