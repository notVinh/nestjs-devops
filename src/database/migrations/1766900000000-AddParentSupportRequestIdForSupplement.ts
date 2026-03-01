import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddParentSupportRequestIdForSupplement1766900000000
  implements MigrationInterface
{
  name = 'AddParentSupportRequestIdForSupplement1766900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Thêm cột parentSupportRequestId để liên kết đơn bổ sung với đơn gốc
    await queryRunner.query(`
      ALTER TABLE "supportRequest"
      ADD COLUMN IF NOT EXISTS "parentSupportRequestId" bigint DEFAULT NULL
    `);

    // Thêm foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "supportRequest"
      ADD CONSTRAINT "FK_supportRequest_parentSupportRequest"
      FOREIGN KEY ("parentSupportRequestId")
      REFERENCES "supportRequest"("id")
      ON DELETE SET NULL
    `);

    // Thêm index để tối ưu query
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_supportRequest_parentSupportRequestId"
      ON "supportRequest"("parentSupportRequestId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_supportRequest_parentSupportRequestId"
    `);

    // Xóa foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "supportRequest"
      DROP CONSTRAINT IF EXISTS "FK_supportRequest_parentSupportRequest"
    `);

    // Xóa cột
    await queryRunner.query(`
      ALTER TABLE "supportRequest"
      DROP COLUMN IF EXISTS "parentSupportRequestId"
    `);
  }
}

