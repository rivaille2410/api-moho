import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { NotificationsListener } from './notifications.listener';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [JwtModule.register({})],
  controllers: [NotificationsController],
  providers: [
    NotificationsGateway,
    NotificationsService,
    NotificationsListener,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
