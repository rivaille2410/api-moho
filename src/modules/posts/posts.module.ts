import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';

import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { PostsPublicController } from './posts.public.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PostsController, PostsPublicController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
