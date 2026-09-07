import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ClerkGuard } from '../auth/clerk.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { TasksService } from './tasks.service';

@Controller('organizations/:organizationId/projects/:projectId/tasks')
@UseGuards(ClerkGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.tasksService.findForProject(organizationId, projectId, user.id);
  }

  @Post()
  create(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @CurrentUser() user: { id: string },
    @Body() body: CreateTaskDto,
  ) {
    return this.tasksService.createForProject(organizationId, projectId, user.id, body);
  }

  @Patch(':taskId')
  update(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: { id: string },
    @Body() body: UpdateTaskDto,
  ) {
    return this.tasksService.updateForProject(organizationId, projectId, taskId, user.id, body);
  }

  @Patch(':taskId/move')
  move(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: { id: string },
    @Body() body: MoveTaskDto,
  ) {
    return this.tasksService.moveForProject(organizationId, projectId, taskId, user.id, body);
  }

  @Delete(':taskId')
  remove(
    @Param('organizationId') organizationId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.tasksService.deleteForProject(organizationId, projectId, taskId, user.id);
  }
}
