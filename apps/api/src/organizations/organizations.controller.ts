import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ClerkGuard } from '../auth/clerk.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
@UseGuards(ClerkGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  async create(
    @CurrentUser() user: { id: string },
    @Body() body: { name: string; slug: string },
  ) {
    return this.organizationsService.create(user.id, body);
  }

  @Get()
  async getMyOrganizations(@CurrentUser() user: { id: string }) {
    return this.organizationsService.findUserOrganizations(user.id);
  }
}
