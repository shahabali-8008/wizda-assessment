import { ParseUUIDPipe } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { BalanceService } from '../application/balance.service';
import { Balance } from '../domain/entities/balance.entity';
import { IngestHcmBatchInput } from './inputs/hcm-batch.input';
import { BalanceGql } from './models/balance.model';

function toGql(b: Balance): BalanceGql {
  return {
    employeeId: b.employeeId,
    locationId: b.locationId,
    daysRemaining: b.daysRemaining,
    lastSyncedAt: b.lastSyncedAt,
  };
}

@Resolver()
export class BalanceResolver {
  constructor(private readonly balanceService: BalanceService) {}

  @Query(() => [BalanceGql], { name: 'balances' })
  async balances(
    @Args('employeeId', { type: () => ID }, ParseUUIDPipe) employeeId: string,
  ): Promise<BalanceGql[]> {
    const rows = await this.balanceService.listForEmployee(employeeId);
    return rows.map(toGql);
  }

  @Query(() => BalanceGql, { name: 'balance', nullable: true })
  async balance(
    @Args('employeeId', { type: () => ID }, ParseUUIDPipe) employeeId: string,
    @Args('locationId', { type: () => ID }, ParseUUIDPipe) locationId: string,
  ): Promise<BalanceGql | null> {
    const row = await this.balanceService.findOne(employeeId, locationId);
    return row ? toGql(row) : null;
  }

  @Mutation(() => [BalanceGql], { name: 'ingestHcmBatch' })
  async ingestHcmBatch(
    @Args('input') input: IngestHcmBatchInput,
  ): Promise<BalanceGql[]> {
    const rows = await this.balanceService.ingestFromHcm(input.rows);
    return rows.map(toGql);
  }
}
