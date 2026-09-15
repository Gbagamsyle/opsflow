import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UnauthorizedException } from '@nestjs/common';
import { verifyToken } from '@clerk/backend';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../database/prisma.service';
import { RealtimeEvent, RealtimeService } from './realtime.service';
import { UsersService } from '../users/users.service';

type AuthenticatedSocket = Socket & { userId?: string };

@WebSocketGateway({
  cors: { origin: 'http://localhost:3000', credentials: true },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly realtimeService: RealtimeService,
  ) {
    this.realtimeService.events.on('changed', (event: RealtimeEvent) => {
      this.server
        ?.to(this.organizationRoom(event.organizationId))
        .emit('organization:changed', event);
    });
  }

  async handleConnection(socket: AuthenticatedSocket) {
    try {
      const token = this.extractToken(socket);
      const payload = await verifyToken(token, {
        secretKey: process.env['CLERK_SECRET_KEY'],
      });
      const user = await this.usersService.findByClerkId(payload.sub);
      if (!user)
        throw new UnauthorizedException(
          'User account has not been synchronized',
        );
      socket.userId = user.id;
    } catch {
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: AuthenticatedSocket) {
    socket.removeAllListeners('organization:subscribe');
  }

  @SubscribeMessage('organization:subscribe')
  async subscribeToOrganization(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() body: { organizationId?: string },
  ) {
    if (!socket.userId || !body?.organizationId) return { ok: false };

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: socket.userId,
          organizationId: body.organizationId,
        },
      },
    });
    if (!membership) return { ok: false };

    await socket.join(this.organizationRoom(body.organizationId));
    return { ok: true };
  }

  private organizationRoom(organizationId: string) {
    return `organization:${organizationId}`;
  }

  private extractToken(socket: Socket) {
    const auth = socket.handshake.auth as unknown;
    const authToken =
      typeof auth === 'object' &&
      auth !== null &&
      'token' in auth &&
      typeof auth.token === 'string'
        ? auth.token
        : null;
    const authorization = socket.handshake.headers.authorization;
    const token =
      typeof authToken === 'string'
        ? authToken
        : typeof authorization === 'string' &&
            authorization.startsWith('Bearer ')
          ? authorization.substring(7)
          : null;
    if (!token) throw new UnauthorizedException('Missing authentication token');
    return token;
  }
}
