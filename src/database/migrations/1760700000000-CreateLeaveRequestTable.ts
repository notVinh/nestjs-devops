import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLeaveRequestTable1760700000000 implements MigrationInterface {
  name = 'CreateLeaveRequestTable1760700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "leaveRequest" (
        id BIGSERIAL NOT NULL,
        "factoryId" INTEGER NOT NULL,
        "employeeId" INTEGER NOT NULL,
        "approverEmployeeId" INTEGER NOT NULL,
        "leaveType" CHARACTER VARYING(20) NOT NULL DEFAULT 'paid' CHECK ("leaveType" IN ('paid','unpaid')),
        "startDate" DATE NOT NULL,
        "endDate" DATE NOT NULL,
        "totalDays" DECIMAL(4,2),
        "reason" CHARACTER VARYING,
        "status" CHARACTER VARYING(20) NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending','approved','rejected','cancelled')),
        "decisionNote" CHARACTER VARYING,
        "decidedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_leaveRequest" PRIMARY KEY (id)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_leaveRequestFactory" ON "leaveRequest" ("factoryId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_leaveRequestEmployee" ON "leaveRequest" ("employeeId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_leaveRequestApprover" ON "leaveRequest" ("approverEmployeeId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_leaveRequestApprover"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_leaveRequestEmployee"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_leaveRequestFactory"`);
    await queryRunner.query(`DROP TABLE "leaveRequest"`);
  }
}


