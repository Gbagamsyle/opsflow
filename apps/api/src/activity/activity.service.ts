import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export type ActivityRecord = {
  organizationId: string;
  actorId: string;
  entityType: 'project' | 'client' | 'task' | 'comment' | 'member';
  entityId: string;
  action: 'created' | 'updated' | 'moved' | 'deleted';
  metadata?: Record<string, string | null>;
};

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async record(activity: ActivityRecord) {
    return this.prisma.activityLog.create({
      data: {
        ...activity,
        metadata: activity.metadata,
      },
    });
  }

  async findForUser(organizationId: string, userId: string, limit = 30) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) throw new NotFoundException('Organization not found');

    return this.prisma.activityLog.findMany({
      where: { organizationId },
      include: { actor: true },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
  }
}
