import { IsEnum } from 'class-validator';
import { PostStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePostStatusDto {
  @ApiProperty({ enum: PostStatus })
  @IsEnum(PostStatus)
  status: PostStatus;
}
