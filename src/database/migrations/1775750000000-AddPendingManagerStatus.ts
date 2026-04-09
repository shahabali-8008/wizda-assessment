import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extends time_off_requests.status CHECK to allow PENDING_MANAGER (manager queue before HCM).
 */
export class AddPendingManagerStatus1775750000000 implements MigrationInterface {
  name = 'AddPendingManagerStatus1775750000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_6d8215ac65871ad7d09157a7cc"`);
    await queryRunner.query(
      `CREATE TABLE "temporary_time_off_requests" ("id" varchar PRIMARY KEY NOT NULL, "employee_id" varchar NOT NULL, "location_id" varchar NOT NULL, "start_date" date NOT NULL, "end_date" date NOT NULL, "requested_days" float NOT NULL, "status" varchar CHECK( "status" IN ('APPROVED','CANCELLED','DRAFT','PENDING_HCM','PENDING_MANAGER','REJECTED','SUBMITTED') ) NOT NULL, "idempotency_key" varchar, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_d8eebde4f6811a189793f29c8aa" UNIQUE ("idempotency_key"), CONSTRAINT "FK_6944dd5929f7204520fb55d25d9" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_70e1818573796a61ea8894a310e" FOREIGN KEY ("location_id") REFERENCES "locations" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "time_off_requests" SET "status" = 'DRAFT' WHERE "status" = 'PENDING_MANAGER'`,
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
  }
}
