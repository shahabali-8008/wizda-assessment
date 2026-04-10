import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HcmClient } from './hcm.client';
import { HttpHcmService } from './http-hcm.service';
import { MockHcmService } from './mock-hcm.service';

const hcmModeLog = new Logger('HcmModule');

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
        if (base) {
          hcmModeLog.log(`HCM: using HTTP client → ${base}`);
          return http;
        }
        hcmModeLog.log('HCM: using in-process MockHcmService');
        return memory;
      },
      inject: [ConfigService, MockHcmService, HttpHcmService],
    },
  ],
  exports: [HcmClient, MockHcmService, HttpHcmService],
})
export class HcmModule {}
