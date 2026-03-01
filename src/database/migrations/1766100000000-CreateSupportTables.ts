import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSupportTables1766100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tạo bảng supportType
    await queryRunner.query(`
      CREATE TABLE "supportType" (
        "id" BIGSERIAL PRIMARY KEY,
        "factoryId" BIGINT NOT NULL,
        "code" VARCHAR(50) NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "unit" VARCHAR(20),
        "requirePhoto" BOOLEAN DEFAULT false,
        "requireQuantity" BOOLEAN DEFAULT false,
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "FK_supportType_factory" FOREIGN KEY ("factoryId") REFERENCES "factory"("id") ON DELETE CASCADE
      )
    `);

    // Index cho supportType
    await queryRunner.query(`
      CREATE INDEX "IDX_supportType_factoryId" ON "supportType" ("factoryId")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_supportType_factoryId_code" ON "supportType" ("factoryId", "code")
    `);

    // 2. Tạo bảng supportRequest
    await queryRunner.query(`
      CREATE TABLE "supportRequest" (
        "id" BIGSERIAL PRIMARY KEY,
        "factoryId" BIGINT NOT NULL,
        "employeeId" BIGINT NOT NULL,
        "requestDate" DATE NOT NULL,
        "status" VARCHAR(20) DEFAULT 'pending' CHECK ("status" IN ('pending', 'approved', 'rejected', 'cancelled')),
        "approverEmployeeIds" INT[],
        "decidedByEmployeeId" BIGINT,
        "decisionNote" VARCHAR(500),
        "decidedAt" TIMESTAMP,
        "note" TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "FK_supportRequest_factory" FOREIGN KEY ("factoryId") REFERENCES "factory"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_supportRequest_employee" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_supportRequest_decidedBy" FOREIGN KEY ("decidedByEmployeeId") REFERENCES "employee"("id") ON DELETE SET NULL
      )
    `);

    // Index cho supportRequest
    await queryRunner.query(`
      CREATE INDEX "IDX_supportRequest_factoryId" ON "supportRequest" ("factoryId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_supportRequest_employeeId" ON "supportRequest" ("employeeId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_supportRequest_requestDate" ON "supportRequest" ("requestDate")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_supportRequest_status" ON "supportRequest" ("status")
    `);

    // 3. Tạo bảng supportRequestItem
    await queryRunner.query(`
      CREATE TABLE "supportRequestItem" (
        "id" BIGSERIAL PRIMARY KEY,
        "supportRequestId" BIGINT NOT NULL,
        "supportTypeId" BIGINT NOT NULL,
        "quantity" DECIMAL(10, 2) DEFAULT 1,
        "photoUrls" JSONB,
        "note" VARCHAR(500),
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "FK_supportRequestItem_supportRequest" FOREIGN KEY ("supportRequestId") REFERENCES "supportRequest"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_supportRequestItem_supportType" FOREIGN KEY ("supportTypeId") REFERENCES "supportType"("id") ON DELETE CASCADE
      )
    `);

    // Index cho supportRequestItem
    await queryRunner.query(`
      CREATE INDEX "IDX_supportRequestItem_supportRequestId" ON "supportRequestItem" ("supportRequestId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_supportRequestItem_supportTypeId" ON "supportRequestItem" ("supportTypeId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "supportRequestItem"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "supportRequest"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "supportType"`);
  }
}
