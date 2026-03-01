import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddParentOvertimeIdForSupplement1766700000000
  implements MigrationInterface
{
  name = 'AddParentOvertimeIdForSupplement1766700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Thêm cột parentOvertimeId để liên kết đơn bổ sung với đơn gốc
    await queryRunner.query(`
      ALTER TABLE "overtime"
      ADD COLUMN IF NOT EXISTS "parentOvertimeId" integer DEFAULT NULL
    `);

    // Thêm foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "overtime"
      ADD CONSTRAINT "FK_overtime_parentOvertime"
      FOREIGN KEY ("parentOvertimeId")
      REFERENCES "overtime"("id")
      ON DELETE SET NULL
    `);

    // Thêm index để tối ưu query
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_overtime_parentOvertimeId"
      ON "overtime"("parentOvertimeId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_overtime_parentOvertimeId"
    `);

    // Xóa foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "overtime"
      DROP CONSTRAINT IF EXISTS "FK_overtime_parentOvertime"
    `);

    // Xóa cột
    await queryRunner.query(`
      ALTER TABLE "overtime"
      DROP COLUMN IF EXISTS "parentOvertimeId"
    `);
  }
}

