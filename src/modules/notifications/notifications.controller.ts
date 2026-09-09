import {
  Get,
  Patch,
  Param,
  UseGuards,
  Controller,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import {
  ApiMarkAsRead,
  ApiUnreadCount,
  ApiMarkAllAsRead,
  ApiListNotifications,
} from './notifications.swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '@/modules/auth/interfaces/current-user.interface';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiListNotifications()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return user.role === Role.ADMIN
      ? this.notificationsService.findAllForAdmin()
      : this.notificationsService.findAllForUser(user.id);
  }

  @Get('unread-count')
  @ApiUnreadCount()
  async unreadCount(@CurrentUser() user: CurrentUserPayload) {
    const count =
      user.role === Role.ADMIN
        ? await this.notificationsService.countUnreadForAdmin()
        : await this.notificationsService.countUnreadForUser(user.id);
    return { count };
  }

  @Patch(':id/read')
  @ApiMarkAsRead()
  markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.notificationsService.markAsRead(id, user);
  }

  @Patch('read-all')
  @ApiMarkAllAsRead()
  markAllAsRead(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.markAllAsRead(user);
  }
}
