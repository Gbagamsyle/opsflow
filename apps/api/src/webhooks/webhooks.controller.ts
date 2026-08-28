import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import { verifyWebhook } from '@clerk/backend/webhooks';
import type { Request } from 'express';
import { WebhooksService } from './webhooks.service';

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('clerk')
  @HttpCode(200)
  async handleClerkWebhook(
    @Req() request: RawBodyRequest,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const signingSecret =
      process.env['CLERK_WEBHOOK_SECRET'] ??
      process.env['CLERK_WEBHOOK_SIGNING_SECRET'];

    if (!signingSecret) {
      throw new Error('CLERK_WEBHOOK_SIGNING_SECRET is not configured');
    }

    const rawHeaders = Object.entries(headers).reduce<Record<string, string>>(
      (result, [key, value]) => {
        if (typeof value === 'string') {
          result[key] = value;
        } else if (Array.isArray(value)) {
          result[key] = value.join(',');
        }
        return result;
      },
      {},
    );
    const body =
      request.rawBody?.toString('utf8') ?? JSON.stringify(request.body);
    const webhookRequest = new Request(
      `${request.protocol}://${request.get('host')}${request.originalUrl}`,
      { method: 'POST', headers: rawHeaders, body },
    );

    try {
      const event = await verifyWebhook(webhookRequest, { signingSecret });
      return await this.webhooksService.handleClerkEvent(event);
    } catch {
      throw new BadRequestException('Invalid Clerk webhook');
    }
  }
}
