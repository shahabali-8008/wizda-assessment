import { registerEnumType } from '@nestjs/graphql';
import { TimeOffRequestStatus } from '../domain/enums/time-off-request-status.enum';

export function registerGraphQlEnums(): void {
  registerEnumType(TimeOffRequestStatus, { name: 'TimeOffRequestStatus' });
}
