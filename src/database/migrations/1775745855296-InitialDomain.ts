import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialDomain1775745855296 implements MigrationInterface {
  name = 'InitialDomain1775745855296';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "employees" ("id" varchar PRIMARY KEY NOT NULL, "email" varchar NOT NULL, "first_name" varchar NOT NULL, "last_name" varchar NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_765bc1ac8967533a04c74a9f6af" UNIQUE ("email"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "locations" ("id" varchar PRIMARY KEY NOT NULL, "code" varchar NOT NULL, "name" varchar NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_1c65ef243169e51b514c814eeae" UNIQUE ("code"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "time_off_requests" ("id" varchar PRIMARY KEY NOT NULL, "employee_id" varchar NOT NULL, "location_id" varchar NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "requested_days" float NOT NULL, "status" varchar CHECK( "status" IN ('DRAFT','SUBMITTED','PENDING_HCM','APPROVED','REJECTED','CANCELLED') ) NOT NULL, "idempotency_key" varchar, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_d8eebde4f6811a189793f29c8aa" UNIQUE ("idempotency_key"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6d8215ac65871ad7d09157a7cc" ON "time_off_requests" ("employee_id", "location_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "balances" ("id" varchar PRIMARY KEY NOT NULL, "employee_id" varchar NOT NULL, "location_id" varchar NOT NULL, "days_remaining" float NOT NULL, "last_synced_at" datetime, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_81b37f141138d7a661c46155f9" ON "balances" ("employee_id", "location_id") `,
    );
    await queryRunner.query(`DROP INDEX "IDX_6d8215ac65871ad7d09157a7cc"`);
    await queryRunner.query(
      `CREATE TABLE "temporary_time_off_requests" ("id" varchar PRIMARY KEY NOT NULL, "employee_id" varchar NOT NULL, "location_id" varchar NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "requested_days" float NOT NULL, "status" varchar CHECK( "status" IN ('DRAFT','SUBMITTED','PENDING_HCM','APPROVED','REJECTED','CANCELLED') ) NOT NULL, "idempotency_key" varchar, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_d8eebde4f6811a189793f29c8aa" UNIQUE ("idempotency_key"), CONSTRAINT "FK_6944dd5929f7204520fb55d25d9" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_70e1818573796a61ea8894a310e" FOREIGN KEY ("location_id") REFERENCES "locations" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_time_off_requests"("id", "employee_id", "location_id", "start_date", "end_date", "requested_days", "status", "idempotency_key", "created_at", "updated_at") SELECT "id", "employee_id", "location_id", "start_date", "end_date", "requested_days", "status", "idempotency_key", "created_at", "updated_at" FROM "time_off_requests"`,
    );
    await queryRunner.query(`DROP TABLE "time_off_requests"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_time_off_requests" RENAME TO "time_off_requests"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6d8215ac65871ad7d09157a7cc" ON "time_off_requests" ("employee_id", "location_id") `,
    );
    await queryRunner.query(`DROP INDEX "IDX_81b37f141138d7a661c46155f9"`);
    await queryRunner.query(
      `CREATE TABLE "temporary_balances" ("id" varchar PRIMARY KEY NOT NULL, "employee_id" varchar NOT NULL, "location_id" varchar NOT NULL, "days_remaining" float NOT NULL, "last_synced_at" datetime, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_1e9c0bf0cd81ea56983835fb2e5" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_420c10b7af5fdd629e56fe3566a" FOREIGN KEY ("location_id") REFERENCES "locations" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_balances"("id", "employee_id", "location_id", "days_remaining", "last_synced_at", "created_at", "updated_at") SELECT "id", "employee_id", "location_id", "days_remaining", "last_synced_at", "created_at", "updated_at" FROM "balances"`,
    );
    await queryRunner.query(`DROP TABLE "balances"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_balances" RENAME TO "balances"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_81b37f141138d7a661c46155f9" ON "balances" ("employee_id", "location_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_81b37f141138d7a661c46155f9"`);
    await queryRunner.query(
      `ALTER TABLE "balances" RENAME TO "temporary_balances"`,
    );
    await queryRunner.query(
      `CREATE TABLE "balances" ("id" varchar PRIMARY KEY NOT NULL, "employee_id" varchar NOT NULL, "location_id" varchar NOT NULL, "days_remaining" float NOT NULL, "last_synced_at" datetime, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`,
    );
    await queryRunner.query(
      `INSERT INTO "balances"("id", "employee_id", "location_id", "days_remaining", "last_synced_at", "created_at", "updated_at") SELECT "id", "employee_id", "location_id", "days_remaining", "last_synced_at", "created_at", "updated_at" FROM "temporary_balances"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_balances"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_81b37f141138d7a661c46155f9" ON "balances" ("employee_id", "location_id") `,
    );
    await queryRunner.query(`DROP INDEX "IDX_6d8215ac65871ad7d09157a7cc"`);
    await queryRunner.query(
      `ALTER TABLE "time_off_requests" RENAME TO "temporary_time_off_requests"`,
    );
    await queryRunner.query(
      `CREATE TABLE "time_off_requests" ("id" varchar PRIMARY KEY NOT NULL, "employee_id" varchar NOT NULL, "location_id" varchar NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "requested_days" float NOT NULL, "status" varchar CHECK( "status" IN ('DRAFT','SUBMITTED','PENDING_HCM','APPROVED','REJECTED','CANCELLED') ) NOT NULL, "idempotency_key" varchar, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_d8eebde4f6811a189793f29c8aa" UNIQUE ("idempotency_key"))`,
    );
    await queryRunner.query(
      `INSERT INTO "time_off_requests"("id", "employee_id", "location_id", "start_date", "end_date", "requested_days", "status", "idempotency_key", "created_at", "updated_at") SELECT "id", "employee_id", "location_id", "start_date", "end_date", "requested_days", "status", "idempotency_key", "created_at", "updated_at" FROM "temporary_time_off_requests"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_time_off_requests"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_6d8215ac65871ad7d09157a7cc" ON "time_off_requests" ("employee_id", "location_id") `,
    );
    await queryRunner.query(`DROP INDEX "IDX_81b37f141138d7a661c46155f9"`);
    await queryRunner.query(`DROP TABLE "balances"`);
    await queryRunner.query(`DROP INDEX "IDX_6d8215ac65871ad7d09157a7cc"`);
    await queryRunner.query(`DROP TABLE "time_off_requests"`);
    await queryRunner.query(`DROP TABLE "locations"`);
    await queryRunner.query(`DROP TABLE "employees"`);
  }
}
