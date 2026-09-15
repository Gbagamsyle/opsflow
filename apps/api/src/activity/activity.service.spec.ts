import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { ActivityService } from './activity.service';

describe('ActivityService', () => {
  let service: ActivityService;
  const prisma = {
    membership: { findUnique: jest.fn() },
    activityLog: { create: jest.fn(), findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ActivityService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ActivityService);
  });

  it('records an activity with actor and metadata', async () => {
    const activity = {
      organizationId: 'org-1',
      actorId: 'user-1',
      entityType: 'project' as const,
      entityId: 'project-1',
      action: 'created' as const,
      metadata: { name: 'Launch' },
    };
    prisma.activityLog.create.mockResolvedValue({
      id: 'activity-1',
      ...activity,
    });

    await expect(service.record(activity)).resolves.toMatchObject({
      id: 'activity-1',
    });
    expect(prisma.activityLog.create).toHaveBeenCalledWith({ data: activity });
  });

  it('only returns activity for organization members', async () => {
    prisma.membership.findUnique.mockResolvedValue(null);

    await expect(service.findForUser('org-1', 'user-1')).rejects.toThrow(
      'Organization not found',
    );
    expect(prisma.activityLog.findMany).not.toHaveBeenCalled();
  });

  it('limits activity results to the requested workspace feed size', async () => {
    prisma.membership.findUnique.mockResolvedValue({ id: 'membership-1' });
    prisma.activityLog.findMany.mockResolvedValue([]);

    await expect(service.findForUser('org-1', 'user-1', 8)).resolves.toEqual(
      [],
    );
    expect(prisma.activityLog.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
      include: { actor: true },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });
  });
});
