import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpHcmService } from './http-hcm.service';

describe('HttpHcmService', () => {
  const base = 'http://127.0.0.1:3099';
  let fetchMock: jest.Mock;
  let svc: HttpHcmService;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const config = {
      get: jest.fn((key: string, def?: string) =>
        key === 'HCM_BASE_URL' ? base : def,
      ),
    } as unknown as ConfigService;
    svc = new HttpHcmService(config);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('getBalance parses JSON body', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ daysRemaining: 12 }),
    });
    const d = await svc.getBalance('e1', 'l1');
    expect(d).toBe(12);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('getBalance throws BadRequest on HTTP error body', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('bad dimension'),
    });
    await expect(svc.getBalance('e', 'l')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('getBalance throws ServiceUnavailable on 503', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.resolve(''),
    });
    await expect(svc.getBalance('e', 'l')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('submitDeduction returns JSON result', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
    const r = await svc.submitDeduction('e', 'l', 1);
    expect(r.ok).toBe(true);
  });

  it('applyBatch throws when batch not ok', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('fail'),
    });
    await expect(svc.applyBatch([])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('getBalance throws when HCM_BASE_URL missing', async () => {
    const config = {
      get: jest.fn(() => ''),
    } as unknown as ConfigService;
    const empty = new HttpHcmService(config);
    await expect(empty.getBalance('a', 'b')).rejects.toThrow(
      BadRequestException,
    );
  });
});
