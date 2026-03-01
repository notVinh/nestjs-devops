import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkflowFieldsToMisaSaOrder1768300000000 implements MigrationInterface {
  name = 'AddWorkflowFieldsToMisaSaOrder1768300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Các trường Workflow Tracking - Theo dõi luồng xử lý đơn hàng
    await queryRunner.query(`
      ALTER TABLE "misaSaOrder"
      ADD COLUMN IF NOT EXISTS "orderWorkflowStatus" VARCHAR(30) DEFAULT 'draft',
      ADD COLUMN IF NOT EXISTS "saleAdminId" INTEGER,
      ADD COLUMN IF NOT EXISTS "saleAdminName" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "saleAdminSubmittedAt" TIMESTAMP WITH TIME ZONE
    `);

    // Tạo index cho orderWorkflowStatus để tìm kiếm nhanh
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_misaSaOrder_orderWorkflowStatus" ON "misaSaOrder" ("orderWorkflowStatus")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_misaSaOrder_orderWorkflowStatus"`);

    // Xóa các cột
    await queryRunner.query(`
      ALTER TABLE "misaSaOrder"
      DROP COLUMN IF EXISTS "orderWorkflowStatus",
      DROP COLUMN IF EXISTS "saleAdminId",
      DROP COLUMN IF EXISTS "saleAdminName",
      DROP COLUMN IF EXISTS "saleAdminSubmittedAt"
    `);
  }
}
