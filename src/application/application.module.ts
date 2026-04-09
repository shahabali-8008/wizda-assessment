import { Module } from '@nestjs/common';
import { DomainModule } from '../domain/domain.module';
import { HcmModule } from '../hcm/hcm.module';
import { BalanceService } from './balance.service';
import { TimeOffRequestService } from './time-off-request.service';

@Module({
  imports: [DomainModule, HcmModule],
  providers: [BalanceService, TimeOffRequestService],
  exports: [BalanceService, TimeOffRequestService],
})
export class ApplicationModule {}
