import { Query, Resolver } from '@nestjs/graphql';

@Resolver()
export class RootResolver {
  @Query(() => String, { name: 'ping' })
  ping(): string {
    return 'pong';
  }
}
