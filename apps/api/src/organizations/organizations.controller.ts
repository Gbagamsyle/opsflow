import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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

  @Get('current')
  async getCurrentOrganization(@CurrentUser() user: { id: string }) {
    return this.organizationsService.findCurrentOrganization(user.id);
  }

  @Get(':id')
  async getOrganization(
    @CurrentUser() user: { id: string },
    @Param('id') organizationId: string,
  ) {
    return this.organizationsService.findByIdForUser(organizationId, user.id);
  }
}
