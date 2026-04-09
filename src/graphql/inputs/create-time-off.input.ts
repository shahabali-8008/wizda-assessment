import { Field, Float, ID, InputType } from '@nestjs/graphql';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

@InputType()
export class CreateTimeOffInput {
  @Field(() => ID)
  @IsUUID()
  employeeId!: string;

  @Field(() => ID)
  @IsUUID()
  locationId!: string;

  @Field()
  @IsDateString()
  startDate!: string;

  @Field()
  @IsDateString()
  endDate!: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0.0001)
  requestedDays!: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
