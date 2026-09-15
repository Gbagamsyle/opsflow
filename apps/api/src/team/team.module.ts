import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';

@Module({
  imports: [AuthModule, UsersModule, RealtimeModule],
  controllers: [TeamController],
  providers: [TeamService],
})
export class TeamModule {}
