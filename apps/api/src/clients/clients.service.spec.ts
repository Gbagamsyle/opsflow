import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { ClientsService } from './clients.service';

describe('ClientsService', () => {
  let service: ClientsService;
  const prisma = {
    membership: { findUnique: jest.fn() },
    client: { findMany: jest.fn(), create: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [ClientsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ClientsService);
  });

  it('rejects client reads for non-members', async () => {
    prisma.membership.findUnique.mockResolvedValue(null);
    await expect(service.findForUser('org-1', 'user-1')).rejects.toThrow(
      'Organization not found',
    );
    expect(prisma.client.findMany).not.toHaveBeenCalled();
  });

  it('creates a client inside the authorized organization', async () => {
    prisma.membership.findUnique.mockResolvedValue({ id: 'membership-1' });
    prisma.client.create.mockResolvedValue({ id: 'client-1', name: 'Acme' });

    await expect(
      service.createForUser('org-1', 'user-1', { name: 'Acme' }),
    ).resolves.toEqual({ id: 'client-1', name: 'Acme' });
    expect(prisma.client.create).toHaveBeenCalledWith({
      data: { organizationId: 'org-1', name: 'Acme' },
    });
  });
});
