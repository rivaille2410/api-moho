import {
  WebSocketServer,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Role } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '@/config/app-config';

interface AuthPayload {
  sub: string;
  role: Role;
}

function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(';').reduce<Record<string, string>>((acc, pair) => {
    const [key, ...rest] = pair.trim().split('=');
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const cookieHeader = client.handshake.headers?.cookie;
      if (!cookieHeader) throw new Error('No cookie provided');

      const cookies = parseCookies(cookieHeader);
      const token = cookies['accessToken'];

      if (!token) throw new Error('No token provided');

      const payload = this.jwtService.verify<AuthPayload>(token, {
        secret: this.configService.getOrThrow('jwt.accessSecret', {
          infer: true,
        }),
      });

      await client.join(`user:${payload.sub}`);

      if (payload.role === Role.ADMIN) {
        await client.join('admins');
      }

      client.data.userId = payload.sub;
      client.data.role = payload.role;

      this.logger.log(
        `Client connected: ${client.id} (user:${payload.sub}, role:${payload.role})`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.warn(`Connection rejected: ${message}`);
      client.emit('auth_error', { message: 'Unauthorized' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  broadcastToAdmins(event: string, payload: unknown) {
    this.server.to('admins').emit(event, payload);
  }

  broadcastToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  broadcastToTarget(
    target: { audience: 'ADMIN' } | { audience: 'USER'; userId: string },
    event: string,
    payload: unknown,
  ) {
    if (target.audience === 'ADMIN') {
      this.broadcastToAdmins(event, payload);
    } else {
      this.broadcastToUser(target.userId, event, payload);
    }
  }
}
