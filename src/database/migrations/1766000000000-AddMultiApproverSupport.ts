import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMultiApproverSupport1766000000000 implements MigrationInterface {
  name = 'AddMultiApproverSupport1766000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===================== LEAVE REQUEST =====================
    // 1. Thêm cột mới cho multi-approver
    await queryRunner.query(`
      ALTER TABLE "leaveRequest"
      ADD COLUMN IF NOT EXISTS "approverEmployeeIds" integer[] DEFAULT NULL
    `);

    // 2. Thêm cột người thực sự duyệt
    await queryRunner.query(`
      ALTER TABLE "leaveRequest"
      ADD COLUMN IF NOT EXISTS "decidedByEmployeeId" integer DEFAULT NULL
    `);

    // 3. Migrate dữ liệu cũ: chuyển approverEmployeeId sang approverEmployeeIds
    await queryRunner.query(`
      UPDATE "leaveRequest"
      SET "approverEmployeeIds" = ARRAY["approverEmployeeId"]
      WHERE "approverEmployeeId" IS NOT NULL
        AND "approverEmployeeIds" IS NULL
    `);

    // 4. Migrate: nếu đã duyệt/từ chối, set decidedByEmployeeId = approverEmployeeId
    await queryRunner.query(`
      UPDATE "leaveRequest"
      SET "decidedByEmployeeId" = "approverEmployeeId"
      WHERE status IN ('approved', 'rejected')
        AND "decidedByEmployeeId" IS NULL
        AND "approverEmployeeId" IS NOT NULL
    `);

    // 5. Thêm index cho cột mới
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_leaveRequest_approverEmployeeIds"
      ON "leaveRequest" USING GIN ("approverEmployeeIds")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_leaveRequest_decidedByEmployeeId"
      ON "leaveRequest" ("decidedByEmployeeId")
    `);

    // ===================== OVERTIME =====================
    // 1. Thêm cột mới cho multi-approver
    await queryRunner.query(`
      ALTER TABLE "overtime"
      ADD COLUMN IF NOT EXISTS "approverEmployeeIds" integer[] DEFAULT NULL
    `);

    // 2. Thêm cột người thực sự duyệt
    await queryRunner.query(`
      ALTER TABLE "overtime"
      ADD COLUMN IF NOT EXISTS "decidedByEmployeeId" integer DEFAULT NULL
    `);

    // 3. Migrate dữ liệu cũ: chuyển approverEmployeeId sang approverEmployeeIds
    await queryRunner.query(`
      UPDATE "overtime"
      SET "approverEmployeeIds" = ARRAY["approverEmployeeId"]
      WHERE "approverEmployeeId" IS NOT NULL
        AND "approverEmployeeIds" IS NULL
    `);

    // 4. Migrate: nếu đã duyệt/từ chối, set decidedByEmployeeId = approverEmployeeId
    await queryRunner.query(`
      UPDATE "overtime"
      SET "decidedByEmployeeId" = "approverEmployeeId"
      WHERE status IN ('approved', 'rejected')
        AND "decidedByEmployeeId" IS NULL
        AND "approverEmployeeId" IS NOT NULL
    `);

    // 5. Thêm index cho cột mới
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_overtime_approverEmployeeIds"
      ON "overtime" USING GIN ("approverEmployeeIds")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_overtime_decidedByEmployeeId"
      ON "overtime" ("decidedByEmployeeId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_leaveRequest_approverEmployeeIds"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_leaveRequest_decidedByEmployeeId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_overtime_approverEmployeeIds"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_overtime_decidedByEmployeeId"`);

    // Drop columns
    await queryRunner.query(`ALTER TABLE "leaveRequest" DROP COLUMN IF EXISTS "approverEmployeeIds"`);
    await queryRunner.query(`ALTER TABLE "leaveRequest" DROP COLUMN IF EXISTS "decidedByEmployeeId"`);
    await queryRunner.query(`ALTER TABLE "overtime" DROP COLUMN IF EXISTS "approverEmployeeIds"`);
    await queryRunner.query(`ALTER TABLE "overtime" DROP COLUMN IF EXISTS "decidedByEmployeeId"`);
  }
}
