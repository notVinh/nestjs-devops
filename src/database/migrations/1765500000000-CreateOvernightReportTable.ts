import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOvernightReportTable1765500000000 implements MigrationInterface {
  name = 'CreateOvernightReportTable1765500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tạo bảng overnightReport
    await queryRunner.query(`
      CREATE TABLE "overnightReport" (
        id BIGSERIAL NOT NULL,
        "factoryId" BIGINT NOT NULL,
        "employeeId" BIGINT NOT NULL,
        "reportDate" DATE NOT NULL,
        "reportTime" TIMESTAMP NOT NULL,
        "location" POINT,
        "address" CHARACTER VARYING,
        "status" CHARACTER VARYING(20) NOT NULL DEFAULT 'reported' CHECK ("status" IN ('reported','confirmed')),
        "note" TEXT,
        "photoUrls" JSONB,
        "receiverEmployeeIds" JSONB,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_overnightReport" PRIMARY KEY (id)
      )
    `);

    // Tạo indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_overnightReport_factoryId" ON "overnightReport" ("factoryId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_overnightReport_employeeId" ON "overnightReport" ("employeeId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_overnightReport_reportDate" ON "overnightReport" ("reportDate")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_overnightReport_status" ON "overnightReport" ("status")`
    );

    // Tạo GIN index cho receiverEmployeeIds để tìm kiếm nhanh
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_overnightReport_receiverEmployeeIds" ON "overnightReport" USING GIN ("receiverEmployeeIds")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_overnightReport_receiverEmployeeIds"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_overnightReport_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_overnightReport_reportDate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_overnightReport_employeeId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_overnightReport_factoryId"`);
    await queryRunner.query(`DROP TABLE "overnightReport"`);
  }
}
