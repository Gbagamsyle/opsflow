import { Injectable } from '@nestjs/common';
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
}
