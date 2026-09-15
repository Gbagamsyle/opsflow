import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ClerkGuard } from '../auth/clerk.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { TeamService } from './team.service';

@Controller('organizations/:organizationId/members')
@UseGuards(ClerkGuard)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  findMembers(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.teamService.findMembers(organizationId, user.id);
  }

  @Patch(':userId/role')
  updateRole(
    @Param('organizationId') organizationId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: { id: string },
    @Body() body: UpdateMemberRoleDto,
  ) {
    return this.teamService.updateMemberRole(organizationId, targetUserId, user.id, body);
  }

  @Delete(':userId')
  remove(
    @Param('organizationId') organizationId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.teamService.removeMember(organizationId, targetUserId, user.id);
  }
}
