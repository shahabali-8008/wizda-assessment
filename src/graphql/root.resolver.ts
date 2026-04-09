import { Query, Resolver } from '@nestjs/graphql';

@Resolver()
export class RootResolver {
  @Query(() => String, { name: 'service' })
  service(): string {
    return 'time-off-api';
  }
}
