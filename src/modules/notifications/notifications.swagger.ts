import {
  ApiParam,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

export const ApiListNotifications = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'List notifications of current user (admin or customer)',
    }),
    ApiOkResponse({
      description: 'List of notifications',
    }),
  );

export const ApiUnreadCount = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Count unread notifications of current user' }),
    ApiOkResponse({
      schema: {
        type: 'object',
        properties: {
          count: { type: 'number', example: 5 },
        },
      },
    }),
  );

export const ApiMarkAsRead = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Mark one notification as read' }),
    ApiParam({ name: 'id', description: 'Notification ID (UUID)' }),
    ApiOkResponse({
      description: 'The updated notification',
    }),
  );

export const ApiMarkAllAsRead = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Mark all notifications as read' }),
    ApiOkResponse({
      description: 'All notifications marked as read',
    }),
  );
