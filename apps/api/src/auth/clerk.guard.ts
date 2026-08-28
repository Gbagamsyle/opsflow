import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { verifyToken } from '@clerk/backend';
import { UsersService } from '../users/users.service';

export interface AuthenticatedRequest extends Request {
  auth?: Awaited<ReturnType<typeof verifyToken>>;
  user?: Awaited<ReturnType<UsersService['findByClerkId']>>;
}

@Injectable()
export class ClerkGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authentication token');
    }

    const token = authHeader.substring(7);

    try {
      const payload = await verifyToken(token, {
        secretKey: process.env['CLERK_SECRET_KEY'],
      });
      const clerkUserId = payload.sub;
      const dbUser = await this.usersService.findByClerkId(clerkUserId);

      if (!dbUser) {
        throw new UnauthorizedException(
          'User account has not been synchronized',
        );
      }

      request.auth = payload;
      request.user = dbUser;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid authentication token');
    }
  }
}
