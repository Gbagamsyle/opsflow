import { Controller, Get, UseGuards } from '@nestjs/common';
import { ClerkGuard } from './clerk.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(ClerkGuard)
  getCurrentUser(@CurrentUser() user: unknown) {
    return user;
  }
}
