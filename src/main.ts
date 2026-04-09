import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

/** Nest emits `dist/src/main.js`, so `../ui` points at `dist/ui` (wrong). Prefer `../../ui`. */
function resolveUiDir(): string {
  const candidates = [
    join(__dirname, '..', 'ui'),
    join(__dirname, '..', '..', 'ui'),
  ];
  return (
    candidates.find((dir) => existsSync(join(dir, 'index.html'))) ??
    candidates[1]
  );
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(resolveUiDir(), { index: ['index.html'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Listening on http://localhost:${port}`);
  console.log(`Dev UI:  http://localhost:${port}/`);
  console.log(`GraphQL: http://localhost:${port}/graphql`);
}
void bootstrap();
