import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Employee } from '../src/domain/entities/employee.entity';
import { Location } from '../src/domain/entities/location.entity';

describe('GraphQL time-off flow (e2e)', () => {
  let app: INestApplication<App>;
  let employeeId: string;
  let locationId: string;

  beforeAll(() => {
    process.env.DATABASE_PATH = ':memory:';
    process.env.TYPEORM_SYNC = 'false';
    process.env.TYPEORM_MIGRATIONS_RUN = 'true';
    process.env.HCM_FORCE_REJECT = 'false';
    process.env.HCM_SILENT_BAD_SUCCESS = 'false';
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    const ds = app.get(DataSource);
    const emp = await ds.getRepository(Employee).save(
      ds.getRepository(Employee).create({
        email: `e2e-${Date.now()}@test.com`,
        firstName: 'Flow',
        lastName: 'User',
      }),
    );
    const loc = await ds.getRepository(Location).save(
      ds.getRepository(Location).create({
        code: `E2E${Date.now()}`,
        name: 'Flow Office',
      }),
    );
    employeeId = emp.id;
    locationId = loc.id;
  });

  afterEach(async () => {
    await app.close();
  });

  it('ingest → create → submit → balance reflects deduction', async () => {
    const ingest = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation Ingest($input: IngestHcmBatchInput!) {
            ingestHcmBatch(input: $input) { employeeId locationId daysRemaining }
          }
        `,
        variables: {
          input: {
            rows: [
              {
                employeeId,
                locationId,
                daysRemaining: 10,
              },
            ],
          },
        },
      });
    expect(ingest.status).toBe(200);
    const ingestBody = ingest.body as {
      errors?: unknown;
      data?: { ingestHcmBatch: unknown };
    };
    expect(ingestBody.errors).toBeUndefined();

    const create = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation Create($input: CreateTimeOffInput!) {
            createTimeOffRequest(input: $input) { id status requestedDays }
          }
        `,
        variables: {
          input: {
            employeeId,
            locationId,
            startDate: '2026-08-01',
            endDate: '2026-08-02',
            requestedDays: 2,
          },
        },
      });
    expect(create.status).toBe(200);
    const createBody = create.body as {
      errors?: unknown;
      data?: { createTimeOffRequest: { id: string } };
    };
    expect(createBody.errors).toBeUndefined();
    const requestId = createBody.data!.createTimeOffRequest.id;

    const submit = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          mutation Submit($id: ID!) {
            submitTimeOffRequest(id: $id) { status }
          }
        `,
        variables: { id: requestId },
      });
    expect(submit.status).toBe(200);
    const submitBody = submit.body as {
      errors?: unknown;
      data?: { submitTimeOffRequest: { status: string } };
    };
    expect(submitBody.errors).toBeUndefined();
    expect(submitBody.data!.submitTimeOffRequest.status).toBe('APPROVED');

    const bal = await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          query B($e: ID!, $l: ID!) {
            balance(employeeId: $e, locationId: $l) { daysRemaining }
          }
        `,
        variables: { e: employeeId, l: locationId },
      });
    expect(bal.status).toBe(200);
    const balBody = bal.body as {
      errors?: unknown;
      data?: { balance: { daysRemaining: number } };
    };
    expect(balBody.errors).toBeUndefined();
    expect(balBody.data!.balance.daysRemaining).toBe(8);
  });
});
