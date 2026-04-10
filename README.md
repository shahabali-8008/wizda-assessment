# Time-Off Microservice (take-home)

NestJS + GraphQL + TypeORM + SQLite (`better-sqlite3`), per assessment requirements.

## Quick start

```bash
cd api
cp .env.example .env
npm install
npm run migration:run   # apply TypeORM migrations (schema is migration-driven; see below)
npm run seed
npm run build
npm run start:prod
```

Schema changes use **migrations** (`TYPEORM_SYNC` defaults to `false`). With `TYPEORM_MIGRATIONS_RUN=true`, pending migrations also run when the app boots; otherwise run `npm run migration:run` before start.

### Mock HCM: two ways to run

The API talks to HCM through an `HcmClient`. You can use either mode; behavior is the same contract, different transport.

| Mode | When | What you do |
|------|------|-------------|
| **In-process (default)** | `HCM_BASE_URL` is **unset** in `.env` | Nothing extra. Nest uses **`MockHcmService`** inside the same Node process. This is what **`npm run start:dev`** uses out of the box. |
| **HTTP mock server** | You set **`HCM_BASE_URL`** | **Terminal 1:** `cd api` → `npm run mock-hcm:http` (listens on **3099** by default, or set `MOCK_HCM_PORT`). **Terminal 2:** in `api/.env` set `HCM_BASE_URL=http://127.0.0.1:3099` (match the mock port). **Then** start the API (`npm run start:dev`). Nest uses **`HttpHcmService`** and calls the mock over HTTP. |

To go back to in-process, remove or comment out `HCM_BASE_URL` and restart the API.

### Domain tables

| Table | Purpose |
|--------|--------|
| `employees` | People requesting time off (`email` unique). |
| `locations` | Sites / dimensions (`code` unique). |
| `balances` | Cached balance per **employee + location** (`days_remaining`, `last_synced_at`); unique on `(employee_id, location_id)`. |
| `time_off_requests` | Request lifecycle (`start_date`, `end_date`, `requested_days`, `status`, optional `idempotency_key`). |

**Endpoints**

- **Health:** `GET http://localhost:3000/health` (no API key; for probes)
- **GraphQL:** `POST http://localhost:3000/graphql` (Playground when `NODE` is not `production`)

### API authentication (optional)

If **`API_KEY`** is set in the environment, all GraphQL operations require:

- Header **`X-Api-Key: <API_KEY>`**, or  
- **`Authorization: Bearer <API_KEY>`**

If **`API_KEY`** is **unset** or empty, GraphQL is open (default for local development and automated tests). With Playground and a key set, add the header in the HTTP headers section.

Implementation: `api/src/auth/api-key.guard.ts` (global guard + `@Public()` on `HealthController`).

### GraphQL (summary)

| Operation | Kind | Purpose |
|-----------|------|--------|
| `ping` | query | Smoke test |
| `balances(employeeId)` / `balance(employeeId, locationId)` | query | Cached balances |
| `ingestHcmBatch(input)` | mutation | HCM batch sync → DB + mock HCM state |
| `timeOffRequests(employeeId)` / `timeOffRequest(id)` | query | Requests |
| `pendingTimeOffRequests(locationId)` | query | Optional `locationId`; lists `PENDING_MANAGER` |
| `createTimeOffRequest(input)` | mutation | `DRAFT` request (optional `idempotencyKey`) |
| `submitTimeOffRequest(id)` | mutation | Reconcile + eligibility → `PENDING_MANAGER` or `REJECTED` |
| `approveTimeOffRequest(id)` / `rejectTimeOffRequest(id)` | mutation | Manager gate → HCM deduct (approve) or `REJECTED` (reject) |
| `cancelTimeOffRequest(id)` | mutation | `DRAFT` → `CANCELLED` |

**HCM** is abstracted as `HcmClient` (see **Mock HCM: two ways to run** above). Tune mock failure modes via `api/.env.example` (`HCM_FORCE_REJECT`, `HCM_SILENT_BAD_SUCCESS`, `HCM_SIMULATE_TIMEOUT`). After `npm run seed`, mock HCM balances match the DB.

Development with hot reload:

```bash
cd api
npm run start:dev
```

## Environment

See `api/.env.example`. Defaults create `api/data/timeoff.sqlite` (directory is created automatically).

## Database migrations

From `api/` (loads `.env` via `data-source.ts`):

```bash
npm run migration:show
npm run migration:run
npm run migration:revert
```

Generate after changing entities:

```bash
npm run migration:generate -- src/database/migrations/DescribeChange
```

## Tests

```bash
cd api
npm run test          # unit / integration (services, in-memory SQLite)
npm run test:e2e      # HTTP + GraphQL (runInBand); includes API key + full flow tests
npm run test:cov      # coverage report → api/coverage/ (enforces thresholds in package.json)
npm run test:ci       # lint + build + unit + coverage + e2e (submission / CI)
```

Default e2e runs **without** `API_KEY`. The **`api-key.e2e-spec.ts`** suite sets `API_KEY` and checks reject/accept behavior.

**Coverage:** Jest `coverageThreshold` requires **≥80%** statements/lines and **≥75%** branches/functions (global) on measured source; migrations, Nest module shells, DB wiring, and the **`graphql/`** tree are excluded from collection (see **`docs/TRD.md` §7** for rationale).


