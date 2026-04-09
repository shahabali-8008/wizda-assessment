import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Balance } from '../domain/entities/balance.entity';
import { Employee } from '../domain/entities/employee.entity';
import { Location } from '../domain/entities/location.entity';
import { TimeOffRequest } from '../domain/entities/time-off-request.entity';
import { HcmModule } from '../hcm/hcm.module';
import { MockHcmService } from '../hcm/mock-hcm.service';
import { BalanceService } from './balance.service';

describe('BalanceService', () => {
  let service: BalanceService;
  let mockHcm: MockHcmService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [Employee, Location, Balance, TimeOffRequest],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Balance]),
        HcmModule,
      ],
      providers: [BalanceService],
    }).compile();

    service = module.get(BalanceService);
    mockHcm = module.get(MockHcmService);
  });

  it('ingestFromHcm updates DB and mock HCM state', async () => {
    const e1 = '11111111-1111-4111-8111-111111111111';
    const l1 = '22222222-2222-4222-8222-222222222222';

    await seedFk(module, e1, l1);

    const result = await service.ingestFromHcm([
      { employeeId: e1, locationId: l1, daysRemaining: 7 },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].daysRemaining).toBe(7);
    expect(mockHcm.peek(e1, l1)).toBe(7);

    const row = await service.findOne(e1, l1);
    expect(row?.daysRemaining).toBe(7);
  });

  it('reconcileFromHcm pulls from mock', async () => {
    const e1 = '33333333-3333-4333-8333-333333333333';
    const l1 = '44444444-4444-4444-8444-444444444444';

    await seedFk(module, e1, l1);

    await service.ingestFromHcm([
      { employeeId: e1, locationId: l1, daysRemaining: 10 },
    ]);
    await mockHcm.applyBatch([
      { employeeId: e1, locationId: l1, daysRemaining: 4 },
    ]);

    const row = await service.reconcileFromHcm(e1, l1);
    expect(row.daysRemaining).toBe(4);
  });
});

async function seedFk(
  m: TestingModule,
  employeeId: string,
  locationId: string,
): Promise<void> {
  const ds = m.get(DataSource);
  const er = ds.getRepository(Employee);
  const lr = ds.getRepository(Location);
  await er.save(
    er.create({
      id: employeeId,
      email: `${employeeId}@test.com`,
      firstName: 'T',
      lastName: 'T',
    }),
  );
  await lr.save(
    lr.create({
      id: locationId,
      code: locationId.slice(0, 8),
      name: 'Loc',
    }),
  );
}
