import { Test, TestingModule } from '@nestjs/testing';
import { BalanceService } from '../application/balance.service';
import { BalanceResolver } from './balance.resolver';

describe('BalanceResolver', () => {
  let resolver: BalanceResolver;
  const balanceService = {
    listForEmployee: jest.fn(),
    findOne: jest.fn(),
    ingestFromHcm: jest.fn(),
  };

  const eid = '11111111-1111-4111-8111-111111111111';
  const lid = '22222222-2222-4222-8222-222222222222';

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BalanceResolver,
        { provide: BalanceService, useValue: balanceService },
      ],
    }).compile();
    resolver = module.get(BalanceResolver);
  });

  it('balances maps entities to GQL', async () => {
    const now = new Date();
    balanceService.listForEmployee.mockResolvedValue([
      {
        employeeId: eid,
        locationId: lid,
        daysRemaining: 3,
        lastSyncedAt: now,
      },
    ]);
    const out = await resolver.balances(eid);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      employeeId: eid,
      locationId: lid,
      daysRemaining: 3,
      lastSyncedAt: now,
    });
  });

  it('balance returns null when missing', async () => {
    balanceService.findOne.mockResolvedValue(null);
    const out = await resolver.balance(eid, lid);
    expect(out).toBeNull();
  });

  it('ingestHcmBatch maps rows', async () => {
    const now = new Date();
    balanceService.ingestFromHcm.mockResolvedValue([
      {
        employeeId: eid,
        locationId: lid,
        daysRemaining: 9,
        lastSyncedAt: now,
      },
    ]);
    const out = await resolver.ingestHcmBatch({
      rows: [{ employeeId: eid, locationId: lid, daysRemaining: 9 }],
    });
    expect(out[0].daysRemaining).toBe(9);
  });
});
