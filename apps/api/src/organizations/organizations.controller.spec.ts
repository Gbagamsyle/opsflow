import { Test, TestingModule } from '@nestjs/testing';
import { ClerkGuard } from '../auth/clerk.guard';
import { UsersService } from '../users/users.service';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsController', () => {
  let controller: OrganizationsController;
  let organizationsService: {
    findByIdForUser: jest.Mock;
    findCurrentOrganization: jest.Mock;
  };

  beforeEach(async () => {
    organizationsService = {
      findByIdForUser: jest.fn(),
      findCurrentOrganization: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        {
          provide: OrganizationsService,
          useValue: organizationsService,
        },
        {
          provide: UsersService,
          useValue: {},
        },
        {
          provide: ClerkGuard,
          useValue: { canActivate: jest.fn(() => true) },
        },
      ],
    }).compile();

    controller = module.get<OrganizationsController>(OrganizationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes the current user and organization id to the service', async () => {
    organizationsService.findByIdForUser.mockResolvedValue({ id: 'org-1' });

    await expect(
      controller.getOrganization({ id: 'user-1' }, 'org-1'),
    ).resolves.toEqual({ id: 'org-1' });
    expect(organizationsService.findByIdForUser).toHaveBeenCalledWith(
      'org-1',
      'user-1',
    );
  });

  it('passes the current user to the current organization service', async () => {
    organizationsService.findCurrentOrganization.mockResolvedValue({
      organization: { id: 'org-1' },
      role: 'OWNER',
    });

    await expect(
      controller.getCurrentOrganization({ id: 'user-1' }),
    ).resolves.toEqual({ organization: { id: 'org-1' }, role: 'OWNER' });
    expect(
      organizationsService.findCurrentOrganization,
    ).toHaveBeenCalledWith('user-1');
  });
});
