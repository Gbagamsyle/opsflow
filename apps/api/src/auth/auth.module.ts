import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ClerkGuard } from './clerk.guard';

@Module({
  providers: [AuthService, ClerkGuard],
  controllers: [AuthController],
  exports: [AuthService, ClerkGuard],
})
export class AuthModule {}
