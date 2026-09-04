import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, data: { name: string; slug: string }) {
    return this.prisma.$transaction(async (transaction) => {
      const organization = await transaction.organization.create({
        data,
      });

      await transaction.membership.create({
        data: {
          userId,
          organizationId: organization.id,
          role: 'OWNER',
          joinedAt: new Date(),
        },
      });

      return organization;
    });
  }

  async findUserOrganizations(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { organization: true },
    });

    return memberships.map(({ organization }) => organization);
  }

  async findByIdForUser(organizationId: string, userId: string) {
    const organization = await this.prisma.organization.findFirst({
      where: {
        id: organizationId,
        memberships: { some: { userId } },
      },
      include: { memberships: { include: { user: true } } },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async findCurrentOrganization(userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!membership) {
      throw new NotFoundException('No workspace found for this user');
    }

    return {
      organization: membership.organization,
      role: membership.role,
    };
  }
}
