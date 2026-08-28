import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByClerkId(clerkUserId: string) {
    return this.prisma.user.findUnique({
      where: {
        clerkUserId,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: {
        id,
      },
    });
  }

  async create(data: {
    clerkUserId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  }) {
    return this.prisma.user.create({
      data,
    });
  }

  async upsertFromClerk(data: {
    clerkUserId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  }) {
    const { clerkUserId, ...userData } = data;

    return this.prisma.user.upsert({
      where: { clerkUserId },
      create: data,
      update: userData,
    });
  }

  async removeByClerkId(clerkUserId: string) {
    return this.prisma.user.delete({
      where: { clerkUserId },
    });
  }
}
