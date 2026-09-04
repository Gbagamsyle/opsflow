import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findForUser(organizationId: string, userId: string) {
    await this.requireMembership(organizationId, userId);

    return this.prisma.client.findMany({
      where: { organizationId },
      include: { projects: true, invoices: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createForUser(organizationId: string, userId: string, data: CreateClientDto) {
    await this.requireMembership(organizationId, userId);

    return this.prisma.client.create({
      data: { organizationId, ...data },
    });
  }

  private async requireMembership(organizationId: string, userId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) throw new NotFoundException('Organization not found');
  }
}
