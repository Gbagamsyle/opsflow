import { IsEnum } from 'class-validator';
import { OrganizationRole } from '../../generated/enums';

export class UpdateMemberRoleDto {
  @IsEnum(OrganizationRole)
  role!: OrganizationRole;
}
