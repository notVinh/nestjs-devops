import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMultiCheckerSupportToArrivalReport1767100000000
  implements MigrationInterface
{
  name = 'AddMultiCheckerSupportToArrivalReport1767100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 0. Đảm bảo checkEmployeeId có thể nullable (vì báo cáo không bắt buộc phải có người duyệt)
    await queryRunner.query(`
      ALTER TABLE "arrivalReport"
      ALTER COLUMN "checkEmployeeId" DROP NOT NULL
    `);

    // 1. Thêm cột danh sách người nhận thông báo (array)
    await queryRunner.query(`
      ALTER TABLE "arrivalReport"
      ADD COLUMN IF NOT EXISTS "checkEmployeeIds" bigint[] DEFAULT NULL
    `);


    // 5. Migrate dữ liệu cũ: chuyển checkEmployeeId sang checkEmployeeIds
    await queryRunner.query(`
      UPDATE "arrivalReport"
      SET "checkEmployeeIds" = ARRAY["checkEmployeeId"]
      WHERE "checkEmployeeId" IS NOT NULL
        AND "checkEmployeeIds" IS NULL
    `);

    // 6. Thêm index cho cột mới để tối ưu query
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_arrivalReport_checkEmployeeIds"
      ON "arrivalReport" USING GIN ("checkEmployeeIds")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_arrivalReport_checkEmployeeIds"`,
    );

    // Drop columns
    await queryRunner.query(
      `ALTER TABLE "arrivalReport" DROP COLUMN IF EXISTS "checkEmployeeIds"`,
    );
  }
}

