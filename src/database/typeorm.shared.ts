import { mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';

/**
 * Resolves and ensures parent dir exists for the SQLite file.
 * `raw` may be relative to cwd (e.g. `data/timeoff.sqlite`).
 * Pass-through `:memory:` for tests (do not `path.resolve` — it breaks the token).
 */
export function resolveDatabaseLocation(raw: string): string {
  if (raw === ':memory:') {
    return ':memory:';
  }
  const database = resolve(raw);
  mkdirSync(dirname(database), { recursive: true });
  return database;
}

/** Same folder as this file: `src/database` or `dist/database` after build. */
function databaseDirname(): string {
  return __dirname;
}

export function nestTypeOrmOptions(params: {
  databasePath: string;
  synchronize: boolean;
  migrationsRun: boolean;
  nodeEnv: string;
}): TypeOrmModuleOptions {
  const database = resolveDatabaseLocation(params.databasePath);
  const dbDir = databaseDirname();
  const isProd = params.nodeEnv === 'production';

  return {
    type: 'better-sqlite3',
    database,
    autoLoadEntities: true,
    migrations: [join(dbDir, 'migrations', '*.{ts,js}')],
    migrationsRun: params.migrationsRun,
    synchronize: params.synchronize,
    logging: isProd ? false : ['error', 'warn'],
  };
}

/** Options for TypeORM CLI (`data-source.ts`). Always `synchronize: false`. */
export function cliDataSourceOptions(): DataSourceOptions {
  const raw = process.env.DATABASE_PATH ?? 'data/timeoff.sqlite';
  const database = resolveDatabaseLocation(raw);
  const dbDir = databaseDirname();

  return {
    type: 'better-sqlite3',
    database,
    entities: [join(dbDir, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(dbDir, 'migrations', '*.{ts,js}')],
    synchronize: false,
    logging: process.env.NODE_ENV === 'production' ? false : ['error', 'warn'],
  };
}
