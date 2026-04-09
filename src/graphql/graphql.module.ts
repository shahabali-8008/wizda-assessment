import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApplicationModule } from '../application/application.module';
import { BalanceResolver } from './balance.resolver';
import { registerGraphQlEnums } from './register-enums';
import { RootResolver } from './root.resolver';
import { TimeOffRequestResolver } from './time-off-request.resolver';

registerGraphQlEnums();

@Module({
  imports: [
    ApplicationModule,
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
  providers: [RootResolver, BalanceResolver, TimeOffRequestResolver],
})
export class AppGraphqlModule {}
