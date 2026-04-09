import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HcmClient } from './hcm.client';
import { HttpHcmService } from './http-hcm.service';
import { MockHcmService } from './mock-hcm.service';

@Module({
  providers: [
    MockHcmService,
    HttpHcmService,
    {
      provide: HcmClient,
      useFactory: (
        config: ConfigService,
        memory: MockHcmService,
        http: HttpHcmService,
      ) => {
        const base = config.get<string>('HCM_BASE_URL', '').trim();
        return base ? http : memory;
      },
      inject: [ConfigService, MockHcmService, HttpHcmService],
    },
  ],
  exports: [HcmClient, MockHcmService, HttpHcmService],
})
export class HcmModule {}
