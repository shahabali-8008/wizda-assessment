import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(() => {
    delete process.env.API_KEY;
    process.env.DATABASE_PATH = ':memory:';
    process.env.TYPEORM_SYNC = 'false';
    process.env.TYPEORM_MIGRATIONS_RUN = 'true';
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.useStaticAssets(join(__dirname, '..', 'ui'), { index: ['index.html'] });
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

  it('GET /health', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({ status: 'ok' });
      });
  });

  it('GET / serves dev UI', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Content-Type', /html/)
      .expect((res) => {
        expect(res.text).toContain('Time-Off API');
      });
  });

  it('POST /graphql ping', () => {
    return request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ ping }' })
      .expect(200)
      .expect((res) => {
        const body = res.body as {
          errors?: unknown;
          data?: { ping?: string };
        };
        expect(body.errors).toBeUndefined();
        expect(body.data?.ping).toBe('pong');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
