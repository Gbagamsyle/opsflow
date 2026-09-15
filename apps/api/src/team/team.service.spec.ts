import { Test } from '@nestjs/testing';
import { OrganizationRole } from '../generated/enums';
import { PrismaService } from '../database/prisma.service';
import { TeamService } from './team.service';

describe('TeamService', () => {
  let service: TeamService;
  const prisma = {
    membership: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [TeamService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(TeamService);
  });

  it('lists members for any organization member', async () => {
    prisma.membership.findUnique.mockResolvedValue({ role: OrganizationRole.MEMBER });
    prisma.membership.findMany.mockResolvedValue([]);

    await expect(service.findMembers('org-1', 'user-1')).resolves.toEqual([]);
    expect(prisma.membership.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
      include: { user: true },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }, { createdAt: 'asc' }],
    });
  });

  it('rejects member role changes', async () => {
    prisma.membership.findUnique.mockResolvedValue({ role: OrganizationRole.MEMBER });

    await expect(
      service.updateMemberRole('org-1', 'user-2', 'user-1', { role: OrganizationRole.ADMIN }),
    ).rejects.toThrow('Only workspace owners and admins can manage members');
    expect(prisma.membership.update).not.toHaveBeenCalled();
  });

  it('prevents changing the owner role', async () => {
    prisma.membership.findUnique
      .mockResolvedValueOnce({ role: OrganizationRole.OWNER })
      .mockResolvedValueOnce({ role: OrganizationRole.OWNER });

    await expect(
      service.updateMemberRole('org-1', 'owner-1', 'user-1', { role: OrganizationRole.ADMIN }),
    ).rejects.toThrow('The workspace owner role cannot be changed');
  });

  it('allows admins to promote members to admin', async () => {
    const updated = { id: 'membership-2', role: OrganizationRole.ADMIN };
    prisma.membership.findUnique
      .mockResolvedValueOnce({ role: OrganizationRole.ADMIN })
      .mockResolvedValueOnce({ role: OrganizationRole.MEMBER });
    prisma.membership.update.mockResolvedValue(updated);

    await expect(
      service.updateMemberRole('org-1', 'user-2', 'admin-1', { role: OrganizationRole.ADMIN }),
    ).resolves.toEqual(updated);
  });

  it('prevents removing the owner', async () => {
    prisma.membership.findUnique
      .mockResolvedValueOnce({ role: OrganizationRole.ADMIN })
      .mockResolvedValueOnce({ role: OrganizationRole.OWNER });

    await expect(service.removeMember('org-1', 'owner-1', 'admin-1')).rejects.toThrow(
      'The workspace owner cannot be removed',
    );
    expect(prisma.membership.delete).not.toHaveBeenCalled();
  });
});
