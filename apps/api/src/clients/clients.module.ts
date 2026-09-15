import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [AuthModule, UsersModule, RealtimeModule, ActivityModule],
  controllers: [ClientsController],
  providers: [ClientsService],
})
export class ClientsModule {}
