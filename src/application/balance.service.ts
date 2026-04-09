import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Balance } from '../domain/entities/balance.entity';
import { HcmClient } from '../hcm/hcm.client';
import type { HcmBalanceRow } from '../hcm/hcm.types';

@Injectable()
export class BalanceService {
  constructor(
    @InjectRepository(Balance)
    private readonly balances: Repository<Balance>,
    private readonly hcm: HcmClient,
  ) {}

  async findOne(
    employeeId: string,
    locationId: string,
  ): Promise<Balance | null> {
    return this.balances.findOne({ where: { employeeId, locationId } });
  }

  async listForEmployee(employeeId: string): Promise<Balance[]> {
    return this.balances.find({
      where: { employeeId },
      order: { locationId: 'ASC' },
    });
  }

  /**
   * Batch sync from HCM: updates mock HCM state and local cache.
   */
  async ingestFromHcm(rows: HcmBalanceRow[]): Promise<Balance[]> {
    await this.hcm.applyBatch(rows);
    const out: Balance[] = [];
    const now = new Date();
    for (const r of rows) {
      let row = await this.balances.findOne({
        where: { employeeId: r.employeeId, locationId: r.locationId },
      });
      if (!row) {
        row = this.balances.create({
          employeeId: r.employeeId,
          locationId: r.locationId,
          daysRemaining: r.daysRemaining,
          lastSyncedAt: now,
        });
      } else {
        row.daysRemaining = r.daysRemaining;
        row.lastSyncedAt = now;
      }
      out.push(await this.balances.save(row));
    }
    return out;
  }

  /** Re-read HCM and persist to our `balances` row (cache refresh). */
  async reconcileFromHcm(
    employeeId: string,
    locationId: string,
  ): Promise<Balance> {
    const days = await this.hcm.getBalance(employeeId, locationId);
    const now = new Date();
    let row = await this.balances.findOne({
      where: { employeeId, locationId },
    });
    if (!row) {
      row = this.balances.create({
        employeeId,
        locationId,
        daysRemaining: days,
        lastSyncedAt: now,
      });
    } else {
      row.daysRemaining = days;
      row.lastSyncedAt = now;
    }
    return this.balances.save(row);
  }
}
