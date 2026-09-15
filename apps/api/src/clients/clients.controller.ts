import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClerkGuard } from '../auth/clerk.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientsService } from './clients.service';

@Controller('organizations/:organizationId/clients')
@UseGuards(ClerkGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  findAll(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.clientsService.findForUser(organizationId, user.id);
  }

  @Post()
  create(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: { id: string },
    @Body() body: CreateClientDto,
  ) {
    return this.clientsService.createForUser(organizationId, user.id, body);
  }

  @Patch(':clientId')
  update(
    @Param('organizationId') organizationId: string,
    @Param('clientId') clientId: string,
    @CurrentUser() user: { id: string },
    @Body() body: UpdateClientDto,
  ) {
    return this.clientsService.updateForUser(
      organizationId,
      clientId,
      user.id,
      body,
    );
  }

  @Delete(':clientId')
  remove(
    @Param('organizationId') organizationId: string,
    @Param('clientId') clientId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.clientsService.deleteForUser(organizationId, clientId, user.id);
  }
}
