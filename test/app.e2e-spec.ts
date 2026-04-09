import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(() => {
    process.env.DATABASE_PATH = ':memory:';
    process.env.TYPEORM_SYNC = 'false';
    process.env.TYPEORM_MIGRATIONS_RUN = 'true';
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

  it('GET /health', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({ status: 'ok' });
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
