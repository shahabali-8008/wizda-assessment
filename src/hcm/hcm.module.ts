import { Module } from '@nestjs/common';
import { HcmClient } from './hcm.client';
import { MockHcmService } from './mock-hcm.service';

@Module({
  providers: [
    MockHcmService,
    { provide: HcmClient, useExisting: MockHcmService },
  ],
  exports: [HcmClient, MockHcmService],
})
export class HcmModule {}
