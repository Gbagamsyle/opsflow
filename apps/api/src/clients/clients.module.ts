import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [ClientsController],
  providers: [ClientsService],
})
export class ClientsModule {}
