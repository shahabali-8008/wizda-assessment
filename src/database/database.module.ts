import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { nestTypeOrmOptions } from './typeorm.shared';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        nestTypeOrmOptions({
          databasePath: config.get<string>(
            'DATABASE_PATH',
            'data/timeoff.sqlite',
          ),
          synchronize: config.get<string>('TYPEORM_SYNC', 'false') === 'true',
          migrationsRun:
            config.get<string>('TYPEORM_MIGRATIONS_RUN', 'true') === 'true',
          nodeEnv: config.get<string>('NODE_ENV', 'development'),
        }),
    }),
  ],
})
export class DatabaseModule {}
