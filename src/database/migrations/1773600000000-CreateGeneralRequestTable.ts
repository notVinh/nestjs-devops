import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGeneralRequestTable1773600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "generalRequest" (
        "id" BIGSERIAL PRIMARY KEY,
        "title" VARCHAR(255) NOT NULL,
        "content" TEXT NOT NULL,
        "employeeId" BIGINT NOT NULL,
        "approverEmployeeId" BIGINT NOT NULL,
        "status" VARCHAR(20) DEFAULT 'pending' CHECK ("status" IN ('pending', 'approved', 'rejected', 'cancelled')),
        "decidedByEmployeeId" BIGINT,
        "decisionNote" VARCHAR(500),
        "decidedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "FK_generalRequest_employee" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_generalRequest_approver" FOREIGN KEY ("approverEmployeeId") REFERENCES "employee"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_generalRequest_decidedBy" FOREIGN KEY ("decidedByEmployeeId") REFERENCES "employee"("id") ON DELETE SET NULL
      )
    `);

    // Indexes for performance
    await queryRunner.query(`
      CREATE INDEX "IDX_generalRequest_employeeId" ON "generalRequest" ("employeeId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_generalRequest_approverEmployeeId" ON "generalRequest" ("approverEmployeeId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_generalRequest_status" ON "generalRequest" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "generalRequest"`);
  }
}
