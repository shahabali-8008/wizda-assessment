import type { HcmBalanceRow, HcmSubmitResult } from './hcm.types';

/**
 * Port for the external HCM. Production implementation would call HTTP APIs;
 * tests and local dev use {@link MockHcmService}.
 */
export abstract class HcmClient {
  /** Current balance in days for the dimension, per HCM. */
  abstract getBalance(employeeId: string, locationId: string): Promise<number>;

  /**
   * Reserve / deduct days (e.g. approved time off). HCM may reject if insufficient.
   */
  abstract submitDeduction(
    employeeId: string,
    locationId: string,
    days: number,
  ): Promise<HcmSubmitResult>;

  /**
   * Full corpus sync from HCM → our service (and mock state).
   */
  abstract applyBatch(rows: HcmBalanceRow[]): Promise<void>;
}
