import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeOffRequestStatus } from '../domain/enums/time-off-request-status.enum';
import { Balance } from '../domain/entities/balance.entity';
import { Employee } from '../domain/entities/employee.entity';
import { Location } from '../domain/entities/location.entity';
import { TimeOffRequest } from '../domain/entities/time-off-request.entity';
import { HcmModule } from '../hcm/hcm.module';
import { BalanceService } from './balance.service';
import { DataSource } from 'typeorm';
import { TimeOffRequestService } from './time-off-request.service';

describe('TimeOffRequestService', () => {
  let service: TimeOffRequestService;
  let balanceService: BalanceService;
  let empId: string;
  let locId: string;

  beforeEach(async () => {
    process.env.HCM_FORCE_REJECT = 'false';
    process.env.HCM_SILENT_BAD_SUCCESS = 'false';

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [Employee, Location, Balance, TimeOffRequest],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Employee, Location, Balance, TimeOffRequest]),
        HcmModule,
      ],
      providers: [BalanceService, TimeOffRequestService],
    }).compile();

    service = module.get(TimeOffRequestService);
    balanceService = module.get(BalanceService);

    const { id: e, location } = await seedEmployeeAndLocation(module);
    empId = e;
    locId = location;
    await balanceService.ingestFromHcm([
      { employeeId: empId, locationId: locId, daysRemaining: 10 },
    ]);
  });

  it('createDraft then submit approves and updates cache', async () => {
    const draft = await service.createDraft({
      employeeId: empId,
      locationId: locId,
      startDate: '2026-06-01',
      endDate: '2026-06-02',
      requestedDays: 2,
    });

    expect(draft.status).toBe(TimeOffRequestStatus.DRAFT);

    const submitted = await service.submit(draft.id);
    expect(submitted.status).toBe(TimeOffRequestStatus.APPROVED);

    const bal = await balanceService.findOne(empId, locId);
    expect(bal?.daysRemaining).toBe(8);
  });

  it('submit rejects when insufficient HCM balance', async () => {
    await balanceService.ingestFromHcm([
      { employeeId: empId, locationId: locId, daysRemaining: 1 },
    ]);

    const draft = await service.createDraft({
      employeeId: empId,
      locationId: locId,
      startDate: '2026-06-01',
      endDate: '2026-06-05',
      requestedDays: 5,
    });

    const submitted = await service.submit(draft.id);
    expect(submitted.status).toBe(TimeOffRequestStatus.REJECTED);
  });

  it('submit rejects when HCM_FORCE_REJECT', async () => {
    process.env.HCM_FORCE_REJECT = 'true';

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [Employee, Location, Balance, TimeOffRequest],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Employee, Location, Balance, TimeOffRequest]),
        HcmModule,
      ],
      providers: [BalanceService, TimeOffRequestService],
    }).compile();

    const svc = module.get(TimeOffRequestService);
    const bal = module.get(BalanceService);
    const { id: e, location } = await seedEmployeeAndLocation(module);

    await bal.ingestFromHcm([
      { employeeId: e, locationId: location, daysRemaining: 10 },
    ]);

    const draft = await svc.createDraft({
      employeeId: e,
      locationId: location,
      startDate: '2026-06-01',
      endDate: '2026-06-02',
      requestedDays: 1,
    });

    const submitted = await svc.submit(draft.id);
    expect(submitted.status).toBe(TimeOffRequestStatus.REJECTED);
  });

  it('submit rejects on silent bad success from HCM', async () => {
    process.env.HCM_SILENT_BAD_SUCCESS = 'true';

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [Employee, Location, Balance, TimeOffRequest],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Employee, Location, Balance, TimeOffRequest]),
        HcmModule,
      ],
      providers: [BalanceService, TimeOffRequestService],
    }).compile();

    const svc = module.get(TimeOffRequestService);
    const bal = module.get(BalanceService);
    const { id: e, location } = await seedEmployeeAndLocation(module);

    await bal.ingestFromHcm([
      { employeeId: e, locationId: location, daysRemaining: 10 },
    ]);

    const draft = await svc.createDraft({
      employeeId: e,
      locationId: location,
      startDate: '2026-06-01',
      endDate: '2026-06-02',
      requestedDays: 2,
    });

    const submitted = await svc.submit(draft.id);
    expect(submitted.status).toBe(TimeOffRequestStatus.REJECTED);
  });

  it('createDraft is idempotent by idempotencyKey', async () => {
    const a = await service.createDraft({
      employeeId: empId,
      locationId: locId,
      startDate: '2026-07-01',
      endDate: '2026-07-02',
      requestedDays: 1,
      idempotencyKey: 'idem-1',
    });
    const b = await service.createDraft({
      employeeId: empId,
      locationId: locId,
      startDate: '2026-07-01',
      endDate: '2026-07-02',
      requestedDays: 1,
      idempotencyKey: 'idem-1',
    });
    expect(a.id).toBe(b.id);
  });
});

async function seedEmployeeAndLocation(module: TestingModule): Promise<{
  id: string;
  location: string;
}> {
  const ds = module.get(DataSource);
  const er = ds.getRepository(Employee);
  const lr = ds.getRepository(Location);

  const emp = er.create({
    email: `t${Date.now()}@test.com`,
    firstName: 'T',
    lastName: 'User',
  });
  await er.save(emp);

  const loc = lr.create({ code: `C${Date.now()}`, name: 'Test Site' });
  await lr.save(loc);

  return { id: emp.id, location: loc.id };
}
