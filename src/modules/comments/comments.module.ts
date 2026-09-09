import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';

@Module({
  imports: [EventEmitterModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
