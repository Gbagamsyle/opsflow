import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ClerkGuard } from '../auth/clerk.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectsService } from './projects.service';

@Controller('organizations/:organizationId/projects')
@UseGuards(ClerkGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.projectsService.findForUser(organizationId, user.id);
  }

  @Post()
  create(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: { id: string },
    @Body() body: CreateProjectDto,
  ) {
    return this.projectsService.createForUser(organizationId, user.id, body);
  }
}
