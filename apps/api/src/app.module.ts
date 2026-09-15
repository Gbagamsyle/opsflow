import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ProjectsModule } from './projects/projects.module';
import { ClientsModule } from './clients/clients.module';
import { TasksModule } from './tasks/tasks.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ActivityModule } from './activity/activity.module';
import { TeamModule } from './team/team.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    WebhooksModule,
    ProjectsModule,
    ClientsModule,
    TasksModule,
    RealtimeModule,
    ActivityModule,
    TeamModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
