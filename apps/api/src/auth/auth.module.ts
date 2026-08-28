import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ClerkGuard } from './clerk.guard';

@Module({
  imports: [UsersModule],
  providers: [AuthService, ClerkGuard],
  controllers: [AuthController],
  exports: [AuthService, ClerkGuard],
})
export class AuthModule {}
