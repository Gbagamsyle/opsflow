import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let service: ProjectsService;
  const prisma = {
    membership: { findUnique: jest.fn() },
    project: { findMany: jest.fn(), create: jest.fn() },
    client: { findFirst: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [ProjectsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ProjectsService);
  });

  it('rejects project reads for non-members', async () => {
    prisma.membership.findUnique.mockResolvedValue(null);
    await expect(service.findForUser('org-1', 'user-1')).rejects.toThrow(
      'Organization not found',
    );
    expect(prisma.project.findMany).not.toHaveBeenCalled();
  });

  it('creates a project only after membership and client checks', async () => {
    prisma.membership.findUnique.mockResolvedValue({ id: 'membership-1' });
    prisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
    prisma.project.create.mockResolvedValue({ id: 'project-1' });

    await expect(
      service.createForUser('org-1', 'user-1', {
        name: 'Launch',
        clientId: 'client-1',
      }),
    ).resolves.toEqual({ id: 'project-1' });
    expect(prisma.project.create).toHaveBeenCalled();
  });
});
