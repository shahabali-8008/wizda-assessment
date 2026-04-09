import { BadRequestException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MockHcmService } from './mock-hcm.service';

describe('MockHcmService', () => {
  let svc: MockHcmService;

  async function createModule(env: Record<string, string>) {
    const mod: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => env],
        }),
      ],
      providers: [MockHcmService],
    }).compile();
    return mod.get(MockHcmService);
  }

  beforeEach(async () => {
    svc = await createModule({});
    await svc.applyBatch([
      {
        employeeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        locationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        daysRemaining: 5,
      },
    ]);
  });

  it('getBalance returns stored value', async () => {
    const d = await svc.getBalance(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    );
    expect(d).toBe(5);
  });

  it('getBalance throws for unknown dimension', async () => {
    /** Sync throws inside getBalance must be wrapped so expect().rejects sees a rejection. */
    await expect(
      Promise.resolve().then(() =>
        svc.getBalance(
          '00000000-0000-4000-8000-000000000001',
          '00000000-0000-4000-8000-000000000002',
        ),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('submitDeduction deducts when sufficient', async () => {
    const r = await svc.submitDeduction(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      2,
    );
    expect(r.ok).toBe(true);
    expect(
      await svc.getBalance(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      ),
    ).toBe(3);
  });

  it('submitDeduction fails when insufficient', async () => {
    const r = await svc.submitDeduction(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      100,
    );
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/Insufficient/);
  });

  it('submitDeduction fails for unknown dimension', async () => {
    const r = await svc.submitDeduction(
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
      1,
    );
    expect(r.ok).toBe(false);
  });

  it('HCM_FORCE_REJECT returns failure', async () => {
    const forced = await createModule({ HCM_FORCE_REJECT: 'true' });
    await forced.applyBatch([
      {
        employeeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        locationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        daysRemaining: 5,
      },
    ]);
    const r = await forced.submitDeduction(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      1,
    );
    expect(r.ok).toBe(false);
  });

  it('HCM_SILENT_BAD_SUCCESS does not deduct', async () => {
    const silent = await createModule({ HCM_SILENT_BAD_SUCCESS: 'true' });
    await silent.applyBatch([
      {
        employeeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        locationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        daysRemaining: 5,
      },
    ]);
    const r = await silent.submitDeduction(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      2,
    );
    expect(r.ok).toBe(true);
    expect(
      await silent.getBalance(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      ),
    ).toBe(5);
  });

  it('HCM_SIMULATE_TIMEOUT throws on calls', async () => {
    const down = await createModule({ HCM_SIMULATE_TIMEOUT: 'true' });
    await expect(
      Promise.resolve().then(() =>
        down.getBalance(
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        ),
      ),
    ).rejects.toThrow(/simulated outage/i);
  });

  it('peek returns undefined for unknown key', () => {
    expect(
      svc.peek(
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002',
      ),
    ).toBeUndefined();
  });
});
