import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database.module';
import { DomainModule } from '../../domain/domain.module';
import { HcmModule } from '../../hcm/hcm.module';
import { SeedService } from './seed.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    DomainModule,
    HcmModule,
  ],
  providers: [SeedService],
})
export class SeedModule {}
