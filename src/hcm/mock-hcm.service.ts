import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HcmClient } from './hcm.client';
import type { HcmBalanceRow, HcmSubmitResult } from './hcm.types';

@Injectable()
export class MockHcmService extends HcmClient {
  private readonly logger = new Logger(MockHcmService.name);
  /** HCM-side balances (source of truth for the mock). */
  private readonly store = new Map<string, number>();

  constructor(private readonly config: ConfigService) {
    super();
  }

  private key(employeeId: string, locationId: string): string {
    return `${employeeId}:${locationId}`;
  }

  getBalance(employeeId: string, locationId: string): Promise<number> {
    this.maybeThrowTransportError();
    const k = this.key(employeeId, locationId);
    if (!this.store.has(k)) {
      throw new BadRequestException(
        `HCM: unknown employee/location dimension (${employeeId}, ${locationId})`,
      );
    }
    return Promise.resolve(this.store.get(k)!);
  }

  submitDeduction(
    employeeId: string,
    locationId: string,
    days: number,
  ): Promise<HcmSubmitResult> {
    this.maybeThrowTransportError();
    if (this.config.get<string>('HCM_FORCE_REJECT', 'false') === 'true') {
      return Promise.resolve({ ok: false, message: 'HCM simulated rejection' });
    }
    const k = this.key(employeeId, locationId);
    const current = this.store.get(k);
    if (current === undefined) {
      return Promise.resolve({ ok: false, message: 'Unknown dimension' });
    }
    if (current < days) {
      return Promise.resolve({ ok: false, message: 'Insufficient balance' });
    }
    /**
     * Simulates a buggy HCM: returns success but does not deduct.
     * Callers should reconcile with getBalance() afterward.
     */
    if (this.config.get<string>('HCM_SILENT_BAD_SUCCESS', 'false') === 'true') {
      this.logger.warn('Mock HCM: silent bad success (no deduction applied)');
      return Promise.resolve({ ok: true });
    }
    this.store.set(k, current - days);
    return Promise.resolve({ ok: true });
  }

  applyBatch(rows: HcmBalanceRow[]): Promise<void> {
    this.maybeThrowTransportError();
    for (const r of rows) {
      this.store.set(this.key(r.employeeId, r.locationId), r.daysRemaining);
    }
    return Promise.resolve();
  }

  /** Test helper / introspection: read internal HCM balance without DB. */
  peek(employeeId: string, locationId: string): number | undefined {
    return this.store.get(this.key(employeeId, locationId));
  }

  private maybeThrowTransportError(): void {
    if (this.config.get<string>('HCM_SIMULATE_TIMEOUT', 'false') === 'true') {
      throw new ServiceUnavailableException('HCM simulated outage');
    }
  }
}
