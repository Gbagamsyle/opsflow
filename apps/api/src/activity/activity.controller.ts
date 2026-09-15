import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ClerkGuard } from '../auth/clerk.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ActivityService } from './activity.service';

@Controller('organizations/:organizationId/activity')
@UseGuards(ClerkGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  findAll(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: string,
  ) {
    return this.activityService.findForUser(
      organizationId,
      user.id,
      Number(limit) || 30,
    );
  }
}
