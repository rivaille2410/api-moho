export class CommentCreatedEvent {
  constructor(
    public readonly commentId: string,
    public readonly reviewId: string,
    public readonly productSlug: string,
    public readonly authorUserId: string,
    public readonly authorName: string,
    public readonly reviewOwnerUserId: string | null,
    public readonly parentCommentOwnerUserId: string | null,
    public readonly isReply: boolean,
  ) {}
}
