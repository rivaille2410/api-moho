import { User, ReviewComment } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CommentAuthorDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional({ nullable: true }) avatarUrl: string | null;
}

export type CommentWithRelations = ReviewComment & {
  user: Pick<User, 'id' | 'name' | 'avatar'>;
  replies?: (ReviewComment & { user: Pick<User, 'id' | 'name' | 'avatar'> })[];
};

export class CommentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() reviewId: string;

  @ApiPropertyOptional({ nullable: true })
  parentId: string | null;

  @ApiProperty({ type: CommentAuthorDto }) author: CommentAuthorDto;

  @ApiProperty({
    description:
      'Empty string when the comment has been soft-deleted but still has replies attached.',
  })
  content: string;

  @ApiProperty() isDeleted: boolean;

  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  @ApiPropertyOptional({ type: () => [CommentResponseDto] })
  replies?: CommentResponseDto[];

  constructor(comment: CommentWithRelations) {
    this.id = comment.id;
    this.reviewId = comment.reviewId;
    this.parentId = comment.parentId;
    this.author = {
      id: comment.user.id,
      name: comment.user.name,
      avatarUrl: comment.user.avatar ?? null,
    };
    this.isDeleted = !!comment.deletedAt;
    this.content = this.isDeleted ? '' : comment.content;
    this.createdAt = comment.createdAt;
    this.updatedAt = comment.updatedAt;
    this.replies = comment.replies?.map(
      (reply) => new CommentResponseDto(reply as CommentWithRelations),
    );
  }
}
