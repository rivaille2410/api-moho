import { Post, PostStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PostResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() slug: string;
  @ApiPropertyOptional() excerpt: string | null;
  @ApiPropertyOptional() thumbnailUrl: string | null;
  @ApiProperty() content: string;
  @ApiProperty({ enum: PostStatus }) status: PostStatus;
  @ApiPropertyOptional() publishedAt: Date | null;
  @ApiProperty() viewCount: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(post: Post) {
    this.id = post.id;
    this.title = post.title;
    this.slug = post.slug;
    this.excerpt = post.excerpt;
    this.thumbnailUrl = post.thumbnailUrl;
    this.content = post.content;
    this.status = post.status;
    this.publishedAt = post.publishedAt;
    this.viewCount = post.viewCount;
    this.createdAt = post.createdAt;
    this.updatedAt = post.updatedAt;
  }
}
