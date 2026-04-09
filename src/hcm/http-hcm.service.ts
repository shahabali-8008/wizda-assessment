import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HcmClient } from './hcm.client';
import type { HcmBalanceRow, HcmSubmitResult } from './hcm.types';

/**
 * Calls a remote mock or real HCM over HTTP when `HCM_BASE_URL` is set.
 * Expected routes match `mock-hcm-server/server.ts`.
 */
@Injectable()
export class HttpHcmService extends HcmClient {
  private readonly logger = new Logger(HttpHcmService.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  private baseUrl(): string {
    const raw = this.config.get<string>('HCM_BASE_URL', '').trim();
    if (!raw) {
      throw new BadRequestException('HCM_BASE_URL is not configured');
    }
    return raw.replace(/\/$/, '');
  }

  async getBalance(employeeId: string, locationId: string): Promise<number> {
    const url = new URL('/hcm/balance', this.baseUrl());
    url.searchParams.set('employeeId', employeeId);
    url.searchParams.set('locationId', locationId);
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      this.maybeThrowStatus(res.status);
      const text = await res.text();
      throw new BadRequestException(text || `HCM HTTP ${res.status}`);
    }
    const body = (await res.json()) as { daysRemaining: number };
    return body.daysRemaining;
  }

  async submitDeduction(
    employeeId: string,
    locationId: string,
    days: number,
  ): Promise<HcmSubmitResult> {
    const res = await fetch(new URL('/hcm/deduct', this.baseUrl()), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, locationId, days }),
    });
    if (!res.ok) {
      this.maybeThrowStatus(res.status);
    }
    return (await res.json()) as HcmSubmitResult;
  }

  async applyBatch(rows: HcmBalanceRow[]): Promise<void> {
    const res = await fetch(new URL('/hcm/batch', this.baseUrl()), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    });
    if (!res.ok) {
      this.maybeThrowStatus(res.status);
      const text = await res.text();
      this.logger.warn(`HCM batch failed: ${text}`);
      throw new BadRequestException(text || `HCM HTTP ${res.status}`);
    }
  }

  private maybeThrowStatus(status: number): void {
    if (status === 503) {
      throw new ServiceUnavailableException('HCM HTTP unavailable');
    }
  }
}
