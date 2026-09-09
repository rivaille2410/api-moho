import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

import { NotificationsGateway } from './notifications.gateway';
import { CreateNotificationInput } from './interfaces/notification.interface';

interface CurrentUserLike {
  id: string;
  role: Role;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async create(input: CreateNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link ?? null,
        metadata: input.metadata ?? undefined,
        audience: input.target.audience,
        recipientId:
          input.target.audience === 'USER' ? input.target.userId : null,
      },
    });

    this.gateway.broadcastToTarget(
      input.target,
      'notification:new',
      notification,
    );

    const unreadCount = await this.prisma.notification.count({
      where:
        input.target.audience === 'ADMIN'
          ? { audience: 'ADMIN', isRead: false }
          : {
              audience: 'USER',
              recipientId: (input.target as { userId: string }).userId,
              isRead: false,
            },
    });

    this.gateway.broadcastToTarget(input.target, 'notification:unread-count', {
      count: unreadCount,
    });

    return notification;
  }

  async findAllForAdmin(limit = 30) {
    return this.prisma.notification.findMany({
      where: { audience: 'ADMIN' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findAllForUser(userId: string, limit = 30) {
    return this.prisma.notification.findMany({
      where: { audience: 'USER', recipientId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async countUnreadForAdmin() {
    return this.prisma.notification.count({
      where: { audience: 'ADMIN', isRead: false },
    });
  }

  async countUnreadForUser(userId: string) {
    return this.prisma.notification.count({
      where: { audience: 'USER', recipientId: userId, isRead: false },
    });
  }

  async markAsRead(id: string, currentUser: CurrentUserLike) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    this.assertOwnership(notification, currentUser);

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(currentUser: CurrentUserLike) {
    if (currentUser.role === Role.ADMIN) {
      return this.prisma.notification.updateMany({
        where: { audience: 'ADMIN', isRead: false },
        data: { isRead: true },
      });
    }

    return this.prisma.notification.updateMany({
      where: { audience: 'USER', recipientId: currentUser.id, isRead: false },
      data: { isRead: true },
    });
  }

  private assertOwnership(
    notification: { audience: string; recipientId: string | null },
    currentUser: CurrentUserLike,
  ) {
    if (notification.audience === 'ADMIN') {
      if (currentUser.role !== Role.ADMIN) throw new ForbiddenException();
      return;
    }
    if (notification.recipientId !== currentUser.id) {
      throw new ForbiddenException();
    }
  }
}
