export class ReturnRequestCreatedEvent {
  constructor(
    public readonly returnRequestId: string,
    public readonly code: string,
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly userId: string,
    public readonly refundAmount: number,
  ) {}
}
