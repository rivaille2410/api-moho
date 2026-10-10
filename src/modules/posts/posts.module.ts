import { Module } from '@nestjs/common';

import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { PostsPublicController } from './posts.public.controller';

@Module({
  controllers: [PostsController, PostsPublicController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
