import { ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { OrganizationRole } from '../generated/enums';
import { PrismaService } from '../database/prisma.service';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly realtime?: RealtimeService,
  ) {}

  async findMembers(organizationId: string, userId: string) {
    await this.requireMembership(organizationId, userId);

    return this.prisma.membership.findMany({
      where: { organizationId },
      include: { user: true },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async updateMemberRole(
    organizationId: string,
    targetUserId: string,
    actorUserId: string,
    data: UpdateMemberRoleDto,
  ) {
    const actorMembership = await this.requireMembership(organizationId, actorUserId);
    const targetMembership = await this.requireTargetMembership(organizationId, targetUserId);

    this.requireManager(actorMembership.role);
    if (targetUserId === actorUserId) {
      throw new ForbiddenException('You cannot change your own role');
    }
    if (targetMembership.role === OrganizationRole.OWNER) {
      throw new ForbiddenException('The workspace owner role cannot be changed');
    }
    if (actorMembership.role === OrganizationRole.ADMIN && data.role === OrganizationRole.OWNER) {
      throw new ForbiddenException('Only the workspace owner can assign the owner role');
    }

    const membership = await this.prisma.membership.update({
      where: { userId_organizationId: { userId: targetUserId, organizationId } },
      data: { role: data.role },
      include: { user: true },
    });
    this.realtime?.publish({ organizationId, resource: 'member', action: 'updated', resourceId: targetUserId });
    return membership;
  }

  async removeMember(organizationId: string, targetUserId: string, actorUserId: string) {
    const actorMembership = await this.requireMembership(organizationId, actorUserId);
    const targetMembership = await this.requireTargetMembership(organizationId, targetUserId);

    this.requireManager(actorMembership.role);
    if (targetUserId === actorUserId) {
      throw new ForbiddenException('You cannot remove yourself from the workspace');
    }
    if (targetMembership.role === OrganizationRole.OWNER) {
      throw new ForbiddenException('The workspace owner cannot be removed');
    }

    await this.prisma.membership.delete({
      where: { userId_organizationId: { userId: targetUserId, organizationId } },
    });
    this.realtime?.publish({ organizationId, resource: 'member', action: 'deleted', resourceId: targetUserId });
    return { removed: true };
  }

  private async requireMembership(organizationId: string, userId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) throw new ForbiddenException('You are not a member of this organization');
    return membership;
  }

  private async requireTargetMembership(organizationId: string, userId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) throw new NotFoundException('Member not found');
    return membership;
  }

  private requireManager(role: OrganizationRole) {
    if (role !== OrganizationRole.OWNER && role !== OrganizationRole.ADMIN) {
      throw new ForbiddenException('Only workspace owners and admins can manage members');
    }
  }
}
