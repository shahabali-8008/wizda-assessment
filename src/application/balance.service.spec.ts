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

  it('listForEmployee returns rows ordered by location', async () => {
    const e1 = '66666666-6666-4666-8666-666666666666';
    const l1 = '77777777-7777-4777-8777-777777777777';
    const l2 = '88888888-8888-4888-8888-888888888888';
    await seedFk(module, e1, l1);
    const ds = module.get(DataSource);
    const lr = ds.getRepository(Location);
    await lr.save(
      lr.create({
        id: l2,
        code: 'LOC88888',
        name: 'Second',
      }),
    );

    await service.ingestFromHcm([
      { employeeId: e1, locationId: l2, daysRemaining: 1 },
      { employeeId: e1, locationId: l1, daysRemaining: 2 },
    ]);

    const list = await service.listForEmployee(e1);
    expect(list.map((r) => r.locationId)).toEqual([l1, l2]);
  });

  it('ingestFromHcm updates existing balance row', async () => {
    const e1 = '99999999-9999-4999-8999-999999999999';
    const l1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    await seedFk(module, e1, l1);

    await service.ingestFromHcm([
      { employeeId: e1, locationId: l1, daysRemaining: 10 },
    ]);
    const second = await service.ingestFromHcm([
      { employeeId: e1, locationId: l1, daysRemaining: 3 },
    ]);

    expect(second[0].daysRemaining).toBe(3);
    expect(mockHcm.peek(e1, l1)).toBe(3);
  });

  it('reconcileFromHcm creates row when cache missing but HCM has balance', async () => {
    const e1 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const l1 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    await seedFk(module, e1, l1);
    await mockHcm.applyBatch([
      { employeeId: e1, locationId: l1, daysRemaining: 8 },
    ]);

    const row = await service.reconcileFromHcm(e1, l1);
    expect(row.daysRemaining).toBe(8);
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
