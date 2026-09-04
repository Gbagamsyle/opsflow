import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prisma: {
    membership: { findFirst: jest.Mock };
    organization: { findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      membership: { findFirst: jest.fn() },
      organization: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns an organization only when the user is a member', async () => {
    const organization = { id: 'org-1', name: 'Acme', slug: 'acme' };
    prisma.organization.findFirst.mockResolvedValue({
      ...organization,
      memberships: [{ userId: 'user-1' }],
    });

    await expect(service.findByIdForUser('org-1', 'user-1')).resolves.toEqual({
      ...organization,
      memberships: [{ userId: 'user-1' }],
    });
    expect(prisma.organization.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'org-1',
        memberships: { some: { userId: 'user-1' } },
      },
      include: { memberships: { include: { user: true } } },
    });
  });

  it('rejects users who are not members', async () => {
    prisma.organization.findFirst.mockResolvedValue(null);

    await expect(service.findByIdForUser('org-1', 'user-1')).rejects.toThrow(
      'Organization not found',
    );
  });

  it('returns the earliest workspace as the current organization', async () => {
    const organization = { id: 'org-1', name: 'Acme', slug: 'acme' };
    prisma.membership.findFirst.mockResolvedValue({
      organization,
      role: 'OWNER',
    });

    await expect(service.findCurrentOrganization('user-1')).resolves.toEqual({
      organization,
      role: 'OWNER',
    });
    expect(prisma.membership.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('rejects current organization lookup when the user has no workspace', async () => {
    prisma.membership.findFirst.mockResolvedValue(null);

    await expect(service.findCurrentOrganization('user-1')).rejects.toThrow(
      'No workspace found for this user',
    );
  });
});
