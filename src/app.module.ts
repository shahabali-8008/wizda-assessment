import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { DomainModule } from './domain/domain.module';
import { AppGraphqlModule } from './graphql/graphql.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    DomainModule,
    AppGraphqlModule,
    HealthModule,
  ],
})
export class AppModule {}
