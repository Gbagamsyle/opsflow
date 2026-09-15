import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [AuthModule, UsersModule, RealtimeModule, ActivityModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
