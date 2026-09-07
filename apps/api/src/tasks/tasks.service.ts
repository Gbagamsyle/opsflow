import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async findForProject(organizationId: string, projectId: string, userId: string) {
    await this.requireProjectAccess(organizationId, projectId, userId);
    return this.prisma.task.findMany({
      where: { organizationId, projectId },
      include: { project: true, assignee: true },
      orderBy: [{ status: 'asc' }, { position: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  async createForProject(organizationId: string, projectId: string, userId: string, data: CreateTaskDto) {
    await this.requireProjectAccess(organizationId, projectId, userId);

    if (data.assigneeId) await this.requireUserInOrganization(organizationId, data.assigneeId);

    const lastTask = await this.prisma.task.findFirst({
      where: { organizationId, projectId, status: data.status ?? 'TODO' },
      orderBy: { position: 'desc' },
    });

    return this.prisma.task.create({
      data: {
        organizationId,
        projectId,
        title: data.title,
        description: data.description === undefined ? undefined : data.description,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        assigneeId: data.assigneeId === undefined ? undefined : data.assigneeId,
        position: (lastTask?.position ?? -1) + 1,
      },
      include: { project: true, assignee: true },
    });
  }

  async updateForProject(organizationId: string, projectId: string, taskId: string, userId: string, data: UpdateTaskDto) {
    await this.requireProjectAccess(organizationId, projectId, userId);
    await this.requireTask(organizationId, projectId, taskId);
    if (data.assigneeId) await this.requireUserInOrganization(organizationId, data.assigneeId);

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
        assigneeId: data.assigneeId,
      },
      include: { project: true, assignee: true },
    });
  }

  async deleteForProject(organizationId: string, projectId: string, taskId: string, userId: string) {
    await this.requireProjectAccess(organizationId, projectId, userId);
    await this.requireTask(organizationId, projectId, taskId);
    return this.prisma.task.delete({ where: { id: taskId } });
  }

  async moveForProject(
    organizationId: string,
    projectId: string,
    taskId: string,
    userId: string,
    data: MoveTaskDto,
  ) {
    await this.requireProjectAccess(organizationId, projectId, userId);
    await this.requireTask(organizationId, projectId, taskId);

    return this.prisma.task.update({
      where: { id: taskId },
      data: { status: data.status, position: data.position },
      include: { project: true, assignee: true },
    });
  }

  private async requireProjectAccess(organizationId: string, projectId: string, userId: string) {
    await this.requireMembership(organizationId, userId);
    const project = await this.prisma.project.findFirst({ where: { id: projectId, organizationId } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async requireTask(organizationId: string, projectId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, organizationId, projectId } });
    if (!task) throw new NotFoundException('Task not found');
  }

  private async requireUserInOrganization(organizationId: string, userId: string) {
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
