import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    WebhooksModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
