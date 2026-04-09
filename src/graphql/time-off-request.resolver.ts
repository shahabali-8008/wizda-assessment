import { ParseUUIDPipe } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { TimeOffRequestService } from '../application/time-off-request.service';
import { TimeOffRequest } from '../domain/entities/time-off-request.entity';
import { CreateTimeOffInput } from './inputs/create-time-off.input';
import { TimeOffRequestGql } from './models/time-off-request.model';

function toGql(r: TimeOffRequest): TimeOffRequestGql {
  return {
    id: r.id,
    employeeId: r.employeeId,
    locationId: r.locationId,
    startDate: r.startDate,
    endDate: r.endDate,
    requestedDays: r.requestedDays,
    status: r.status,
    idempotencyKey: r.idempotencyKey,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

@Resolver()
export class TimeOffRequestResolver {
  constructor(private readonly timeOff: TimeOffRequestService) {}

  @Query(() => TimeOffRequestGql, { name: 'timeOffRequest', nullable: true })
  async timeOffRequest(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<TimeOffRequestGql | null> {
    const row = await this.timeOff.findById(id);
    return row ? toGql(row) : null;
  }

  @Query(() => [TimeOffRequestGql], { name: 'timeOffRequests' })
  async timeOffRequests(
    @Args('employeeId', { type: () => ID }, ParseUUIDPipe) employeeId: string,
  ): Promise<TimeOffRequestGql[]> {
    const rows = await this.timeOff.listForEmployee(employeeId);
    return rows.map(toGql);
  }

  @Mutation(() => TimeOffRequestGql, { name: 'createTimeOffRequest' })
  async createTimeOffRequest(
    @Args('input') input: CreateTimeOffInput,
  ): Promise<TimeOffRequestGql> {
    const row = await this.timeOff.createDraft({
      employeeId: input.employeeId,
      locationId: input.locationId,
      startDate: input.startDate,
      endDate: input.endDate,
      requestedDays: input.requestedDays,
      idempotencyKey: input.idempotencyKey ?? null,
    });
    return toGql(row);
  }

  @Mutation(() => TimeOffRequestGql, { name: 'submitTimeOffRequest' })
  async submitTimeOffRequest(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<TimeOffRequestGql> {
    const row = await this.timeOff.submit(id);
    return toGql(row);
  }

  @Mutation(() => TimeOffRequestGql, { name: 'cancelTimeOffRequest' })
  async cancelTimeOffRequest(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<TimeOffRequestGql> {
    const row = await this.timeOff.cancel(id);
    return toGql(row);
  }
}
