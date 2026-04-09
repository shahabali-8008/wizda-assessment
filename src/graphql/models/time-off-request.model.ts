import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { TimeOffRequestStatus } from '../../domain/enums/time-off-request-status.enum';

@ObjectType('TimeOffRequest')
export class TimeOffRequestGql {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  employeeId!: string;

  @Field(() => ID)
  locationId!: string;

  @Field(() => String)
  startDate!: string;

  @Field(() => String)
  endDate!: string;

  @Field(() => Float)
  requestedDays!: number;

  @Field(() => TimeOffRequestStatus)
  status!: TimeOffRequestStatus;

  @Field(() => String, { nullable: true })
  idempotencyKey!: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
