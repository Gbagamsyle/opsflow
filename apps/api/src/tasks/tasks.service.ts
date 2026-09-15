import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { RealtimeService } from '../realtime/realtime.service';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly realtime?: RealtimeService,
    @Optional() private readonly activity?: ActivityService,
  ) {}

  async findForProject(
    organizationId: string,
    projectId: string,
    userId: string,
  ) {
    await this.requireProjectAccess(organizationId, projectId, userId);
    return this.prisma.task.findMany({
      where: { organizationId, projectId },
      include: {
        project: true,
        assignee: true,
        comments: { include: { user: true }, orderBy: { createdAt: 'asc' } },
      },
      orderBy: [{ status: 'asc' }, { position: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  async createForProject(
    organizationId: string,
    projectId: string,
    userId: string,
    data: CreateTaskDto,
  ) {
    await this.requireProjectAccess(organizationId, projectId, userId);

    if (data.assigneeId)
      await this.requireUserInOrganization(organizationId, data.assigneeId);

    const lastTask = await this.prisma.task.findFirst({
      where: { organizationId, projectId, status: data.status ?? 'TODO' },
      orderBy: { position: 'desc' },
    });

    const task = await this.prisma.task.create({
      data: {
        organizationId,
        projectId,
        title: data.title,
        description:
          data.description === undefined ? undefined : data.description,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        assigneeId: data.assigneeId === undefined ? undefined : data.assigneeId,
        position: (lastTask?.position ?? -1) + 1,
      },
      include: { project: true, assignee: true },
    });
    this.realtime?.publish({
      organizationId,
      projectId,
      resource: 'task',
      action: 'created',
      resourceId: task.id,
    });
    await this.activity?.record({
      organizationId,
      actorId: userId,
      entityType: 'task',
      entityId: task.id,
      action: 'created',
      metadata: { name: task.title, projectId },
    });
    return task;
  }

  async updateForProject(
    organizationId: string,
    projectId: string,
    taskId: string,
    userId: string,
    data: UpdateTaskDto,
  ) {
    await this.requireProjectAccess(organizationId, projectId, userId);
    const currentTask = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId, projectId },
    });
    if (!currentTask) throw new NotFoundException('Task not found');
    if (data.assigneeId)
      await this.requireUserInOrganization(organizationId, data.assigneeId);

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        title: data.title,
        description: data.description,
        status: data.status === currentTask.status ? data.status : undefined,
        priority: data.priority,
        dueDate: data.dueDate
          ? new Date(data.dueDate)
          : data.dueDate === null
            ? null
            : undefined,
        assigneeId: data.assigneeId,
      },
      include: { project: true, assignee: true },
    });

    if (data.status && data.status !== currentTask.status) {
      const position = await this.prisma.task.count({
        where: { organizationId, projectId, status: data.status },
      });
      return this.moveForProject(organizationId, projectId, taskId, userId, {
        status: data.status,
        position,
      });
    }

    this.realtime?.publish({
      organizationId,
      projectId,
      resource: 'task',
      action: 'updated',
      resourceId: updatedTask.id,
    });
    await this.activity?.record({
      organizationId,
      actorId: userId,
      entityType: 'task',
      entityId: updatedTask.id,
      action: 'updated',
      metadata: { name: updatedTask.title, projectId },
    });
    return updatedTask;
  }

  async deleteForProject(
    organizationId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ) {
    await this.requireProjectAccess(organizationId, projectId, userId);
    await this.requireTask(organizationId, projectId, taskId);
    const task = await this.prisma.task.delete({ where: { id: taskId } });
    this.realtime?.publish({
      organizationId,
      projectId,
      resource: 'task',
      action: 'deleted',
      resourceId: task.id,
    });
    await this.activity?.record({
      organizationId,
      actorId: userId,
      entityType: 'task',
      entityId: task.id,
      action: 'deleted',
      metadata: { name: task.title, projectId },
    });
    return task;
  }

  async moveForProject(
    organizationId: string,
    projectId: string,
    taskId: string,
    userId: string,
    data: MoveTaskDto,
  ) {
    await this.requireProjectAccess(organizationId, projectId, userId);
    const currentTask = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId, projectId },
    });
    if (!currentTask) throw new NotFoundException('Task not found');

    return this.prisma.$transaction(async (transaction) => {
      const sourceTasks = await transaction.task.findMany({
        where: { organizationId, projectId, status: currentTask.status },
        orderBy: [{ position: 'asc' }, { updatedAt: 'desc' }],
      });
      const targetTasks =
        currentTask.status === data.status
          ? sourceTasks
          : await transaction.task.findMany({
              where: { organizationId, projectId, status: data.status },
              orderBy: [{ position: 'asc' }, { updatedAt: 'desc' }],
            });
      const sourceWithoutTask = sourceTasks.filter(
        (task) => task.id !== taskId,
      );
      const targetWithoutTask = targetTasks.filter(
        (task) => task.id !== taskId,
      );
      const targetPosition = Math.min(data.position, targetWithoutTask.length);
      const orderedTarget = [...targetWithoutTask];
      orderedTarget.splice(targetPosition, 0, currentTask);
      const updates =
        currentTask.status === data.status
          ? orderedTarget.map((task, position) => ({
              id: task.id,
              status: data.status,
              position,
            }))
          : [
              ...sourceWithoutTask.map((task, position) => ({
                id: task.id,
                status: currentTask.status,
                position,
              })),
              ...orderedTarget.map((task, position) => ({
                id: task.id,
                status: data.status,
                position,
              })),
            ];

      await Promise.all(
        updates.map((update) =>
          transaction.task.update({
            where: { id: update.id },
            data: { status: update.status, position: update.position },
          }),
        ),
      );

      const task = await transaction.task.findUnique({
        where: { id: taskId },
        include: { project: true, assignee: true },
      });
      this.realtime?.publish({
        organizationId,
        projectId,
        resource: 'task',
        action: 'updated',
        resourceId: taskId,
      });
      await this.activity?.record({
        organizationId,
        actorId: userId,
        entityType: 'task',
        entityId: taskId,
        action: 'moved',
        metadata: {
          name: task?.title ?? null,
          projectId,
          fromStatus: currentTask.status,
          toStatus: data.status,
        },
      });
      return task;
    });
  }

  async findComments(
    organizationId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ) {
    await this.requireProjectAccess(organizationId, projectId, userId);
    await this.requireTask(organizationId, projectId, taskId);
    return this.prisma.taskComment.findMany({
      where: { taskId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createComment(
    organizationId: string,
    projectId: string,
    taskId: string,
    userId: string,
    data: CreateCommentDto,
  ) {
    await this.requireProjectAccess(organizationId, projectId, userId);
    await this.requireTask(organizationId, projectId, taskId);
    const comment = await this.prisma.taskComment.create({
      data: { taskId, userId, body: data.body },
      include: { user: true },
    });
    this.realtime?.publish({
      organizationId,
      projectId,
      resource: 'comment',
      action: 'created',
      resourceId: comment.id,
    });
    await this.activity?.record({
      organizationId,
      actorId: userId,
      entityType: 'comment',
      entityId: comment.id,
      action: 'created',
      metadata: { projectId, taskId },
    });
    return comment;
  }

  private async requireProjectAccess(
    organizationId: string,
    projectId: string,
    userId: string,
  ) {
    await this.requireMembership(organizationId, userId);
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async requireTask(
    organizationId: string,
    projectId: string,
    taskId: string,
  ) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId, projectId },
    });
    if (!task) throw new NotFoundException('Task not found');
  }

  private async requireUserInOrganization(
    organizationId: string,
    userId: string,
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) throw new NotFoundException('User not found');
  }

  private async requireMembership(organizationId: string, userId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) throw new NotFoundException('Organization not found');
  }
}
