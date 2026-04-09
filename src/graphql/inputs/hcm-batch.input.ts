import { Field, Float, ID, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsNumber, IsUUID, ValidateNested } from 'class-validator';

@InputType()
export class HcmBalanceRowInput {
  @Field(() => ID)
  @IsUUID()
  employeeId!: string;

  @Field(() => ID)
  @IsUUID()
  locationId!: string;

  @Field(() => Float)
  @IsNumber()
  daysRemaining!: number;
}

@InputType()
export class IngestHcmBatchInput {
  @Field(() => [HcmBalanceRowInput])
  @ValidateNested({ each: true })
  @Type(() => HcmBalanceRowInput)
  rows!: HcmBalanceRowInput[];
}
