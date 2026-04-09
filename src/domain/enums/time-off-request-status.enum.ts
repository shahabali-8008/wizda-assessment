export enum TimeOffRequestStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  /** Queued for manager approval before calling HCM. */
  PENDING_MANAGER = 'PENDING_MANAGER',
  PENDING_HCM = 'PENDING_HCM',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}
