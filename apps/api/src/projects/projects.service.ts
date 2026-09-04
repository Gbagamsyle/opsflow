import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findForUser(organizationId: string, userId: string) {
    await this.requireMembership(organizationId, userId);

    return this.prisma.project.findMany({
      where: { organizationId },
      include: { client: true, members: { include: { user: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createForUser(organizationId: string, userId: string, data: CreateProjectDto) {
    await this.requireMembership(organizationId, userId);

    if (data.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: data.clientId, organizationId },
      });
      if (!client) throw new NotFoundException('Client not found');
    }

    return this.prisma.project.create({
      data: {
        organizationId,
        createdById: userId,
        name: data.name,
        description: data.description,
        status: data.status,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        clientId: data.clientId,
      },
      include: { client: true },
    });
  }

  private async requireMembership(organizationId: string, userId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) throw new NotFoundException('Organization not found');
  }
}
