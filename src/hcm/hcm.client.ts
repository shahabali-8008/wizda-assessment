import type { HcmBalanceRow, HcmSubmitResult } from './hcm.types';

/**
 * Port for the external HCM. Production would call HTTP APIs; local dev uses
 * {@link MockHcmService} or {@link HttpHcmService} when `HCM_BASE_URL` is set.
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
