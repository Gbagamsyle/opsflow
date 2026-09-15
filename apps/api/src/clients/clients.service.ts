import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { RealtimeService } from '../realtime/realtime.service';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly realtime?: RealtimeService,
    @Optional() private readonly activity?: ActivityService,
  ) {}

  async findForUser(organizationId: string, userId: string) {
    await this.requireMembership(organizationId, userId);

    return this.prisma.client.findMany({
      where: { organizationId },
      include: { projects: true, invoices: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOneForUser(organizationId: string, clientId: string, userId: string) {
    await this.requireMembership(organizationId, userId);

    const client = await this.prisma.client.findFirst({
      where: { id: clientId, organizationId },
      include: {
        projects: {
          include: {
            tasks: {
              include: { assignee: true },
              orderBy: [{ status: 'asc' }, { position: 'asc' }, { updatedAt: 'desc' }],
            },
          },
          orderBy: { updatedAt: 'desc' },
        },
        invoices: { orderBy: { updatedAt: 'desc' } },
      },
    });
    if (!client) throw new NotFoundException('Client not found');

    const projectIds = client.projects.map((project) => project.id);
    const taskIds = client.projects.flatMap((project) => project.tasks.map((task) => task.id));
    const activity = await this.prisma.activityLog.findMany({
      where: {
        organizationId,
        OR: [
          { entityType: 'client', entityId: clientId },
          ...(projectIds.length ? [{ entityType: 'project', entityId: { in: projectIds } }] : []),
          ...(taskIds.length ? [{ entityType: 'task', entityId: { in: taskIds } }] : []),
        ],
      },
      include: { actor: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return { ...client, activity };
  }

  async createForUser(
    organizationId: string,
    userId: string,
    data: CreateClientDto,
  ) {
    await this.requireMembership(organizationId, userId);

    const client = await this.prisma.client.create({
      data: { organizationId, ...data },
    });
    this.realtime?.publish({
      organizationId,
      resource: 'client',
      action: 'created',
      resourceId: client.id,
    });
    await this.activity?.record({
      organizationId,
      actorId: userId,
      entityType: 'client',
      entityId: client.id,
      action: 'created',
      metadata: { name: client.name },
    });
    return client;
  }

  async updateForUser(
    organizationId: string,
    clientId: string,
    userId: string,
    data: UpdateClientDto,
  ) {
    await this.requireMembership(organizationId, userId);
    await this.requireClient(organizationId, clientId);

    const client = await this.prisma.client.update({
      where: { id: clientId },
      data,
    });
    this.realtime?.publish({
      organizationId,
      resource: 'client',
      action: 'updated',
      resourceId: client.id,
    });
    await this.activity?.record({
      organizationId,
      actorId: userId,
      entityType: 'client',
      entityId: client.id,
      action: 'updated',
      metadata: { name: client.name },
    });
    return client;
  }

  async deleteForUser(
    organizationId: string,
    clientId: string,
    userId: string,
  ) {
    await this.requireMembership(organizationId, userId);
    await this.requireClient(organizationId, clientId);

    const client = await this.prisma.client.delete({ where: { id: clientId } });
    this.realtime?.publish({
      organizationId,
      resource: 'client',
      action: 'deleted',
      resourceId: client.id,
    });
    await this.activity?.record({
      organizationId,
      actorId: userId,
      entityType: 'client',
      entityId: client.id,
      action: 'deleted',
      metadata: { name: client.name },
    });
    return client;
  }

  private async requireClient(organizationId: string, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, organizationId },
    });
    if (!client) throw new NotFoundException('Client not found');
  }

  private async requireMembership(organizationId: string, userId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) throw new NotFoundException('Organization not found');
  }
}
