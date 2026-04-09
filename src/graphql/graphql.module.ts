import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { RootResolver } from './root.resolver';

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get<string>('NODE_ENV') === 'production';
        return {
          autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
          sortSchema: true,
          playground: !isProd,
        };
      },
    }),
  ],
  providers: [RootResolver],
})
export class AppGraphqlModule {}
