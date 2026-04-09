import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('API key guard (e2e)', () => {
  let app: INestApplication<App>;
  const secret = 'e2e-secret-key-for-auth';

  beforeAll(() => {
    process.env.DATABASE_PATH = ':memory:';
    process.env.TYPEORM_SYNC = 'false';
    process.env.TYPEORM_MIGRATIONS_RUN = 'true';
    process.env.API_KEY = secret;
  });

  afterAll(() => {
    delete process.env.API_KEY;
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
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health is public without API key', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({ status: 'ok' });
      });
  });

  /** Apollo often returns HTTP 200 with `errors[]`; REST-style 401 may also occur. */
  function expectAuthFailure(res: { status: number; body: unknown }): void {
    if (res.status === 401) {
      return;
    }
    expect(res.status).toBe(200);
    const body = res.body as { errors?: Array<{ message?: string }> };
    expect(body.errors?.length).toBeGreaterThan(0);
    const msg = body.errors?.[0]?.message ?? '';
    expect(msg).toMatch(/API key|Unauthorized/i);
  }

  it('GraphQL rejects when API key missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ ping }' });

    expectAuthFailure(res);
  });

  it('GraphQL rejects wrong API key', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('x-api-key', 'wrong')
      .send({ query: '{ ping }' });

    expectAuthFailure(res);
  });

  it('GraphQL accepts correct X-Api-Key header', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('x-api-key', secret)
      .send({ query: '{ ping }' });

    expect(res.status).toBe(200);
    const body = res.body as { errors?: unknown; data?: { ping: string } };
    expect(body.errors).toBeUndefined();
    expect(body.data?.ping).toBe('pong');
  });

  it('GraphQL accepts Authorization: Bearer token', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${secret}`)
      .send({ query: '{ ping }' });

    expect(res.status).toBe(200);
    const body = res.body as { data?: { ping: string } };
    expect(body.data?.ping).toBe('pong');
  });
});
