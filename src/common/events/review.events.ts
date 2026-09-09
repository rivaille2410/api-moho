export class ReviewCreatedEvent {
  constructor(
    public readonly reviewId: string,
    public readonly productId: string,
    public readonly productName: string,
    public readonly rating: number,
    public readonly authorName: string,
  ) {}
}
