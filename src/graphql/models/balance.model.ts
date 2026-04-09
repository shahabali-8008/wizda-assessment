import { Field, Float, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('Balance')
export class BalanceGql {
  @Field(() => ID)
  employeeId!: string;

  @Field(() => ID)
  locationId!: string;

  @Field(() => Float)
  daysRemaining!: number;

  @Field(() => Date, { nullable: true })
  lastSyncedAt!: Date | null;
}
