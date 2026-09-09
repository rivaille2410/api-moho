import { NotificationType, Prisma } from '@prisma/client';

export type NotificationTarget =
  { audience: 'ADMIN' } | { audience: 'USER'; userId: string };

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Prisma.InputJsonValue;
  target: NotificationTarget;
}
