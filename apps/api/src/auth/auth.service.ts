import { Injectable, UnauthorizedException } from '@nestjs/common';
import { verifyToken } from '@clerk/backend';
import 'dotenv/config';

@Injectable()
export class AuthService {
  async verifyAccessToken(token: string) {
    const secretKey = process.env['CLERK_SECRET_KEY'];

    if (!secretKey) {
      throw new Error('CLERK_SECRET_KEY is not configured');
    }

    try {
      return await verifyToken(token, { secretKey });
    } catch {
      throw new UnauthorizedException('Invalid Clerk token');
    }
  }
}
