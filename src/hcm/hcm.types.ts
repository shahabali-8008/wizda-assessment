/** Row pushed from HCM batch sync (per employee + location). */
export interface HcmBalanceRow {
  employeeId: string;
  locationId: string;
  daysRemaining: number;
}

export interface HcmSubmitResult {
  ok: boolean;
  message?: string;
}
