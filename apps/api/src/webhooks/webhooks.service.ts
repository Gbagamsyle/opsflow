import { Injectable } from '@nestjs/common';
import { WebhookEvent } from '@clerk/backend';
import { UsersService } from '../users/users.service';

@Injectable()
export class WebhooksService {
  constructor(private readonly usersService: UsersService) {}

  async handleClerkEvent(event: WebhookEvent) {
    if (event.type === 'user.deleted') {
      if (event.data.id) {
        await this.usersService.removeByClerkId(event.data.id);
      }
      return { received: true };
    }

    if (event.type !== 'user.created' && event.type !== 'user.updated') {
      return { received: true };
    }

    const email =
      event.data.email_addresses.find(
        (address) => address.id === event.data.primary_email_address_id,
      )?.email_address ?? event.data.email_addresses[0]?.email_address;

    if (!email) {
      throw new Error('Clerk user webhook has no email address');
    }

    await this.usersService.upsertFromClerk({
      clerkUserId: event.data.id,
      email,
      firstName: event.data.first_name ?? undefined,
      lastName: event.data.last_name ?? undefined,
      avatarUrl: event.data.image_url ?? undefined,
    });

    return { received: true };
  }
}
