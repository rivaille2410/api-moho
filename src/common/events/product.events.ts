export class ProductLowStockEvent {
  constructor(
    public readonly variantId: string,
    public readonly variantName: string,
    public readonly productId: string,
    public readonly productName: string,
    public readonly currentStock: number,
  ) {}
}
