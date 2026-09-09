export class PaymentAwaitingConfirmEvent {
  constructor(
    public readonly paymentId: string,
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly amount: number,
  ) {}
}
