import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [AuthModule, UsersModule, RealtimeModule, ActivityModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
