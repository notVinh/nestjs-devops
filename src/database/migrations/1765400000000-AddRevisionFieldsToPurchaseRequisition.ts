import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRevisionFieldsToPurchaseRequisition1765400000000
  implements MigrationInterface
{
  name = 'AddRevisionFieldsToPurchaseRequisition1765400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Thêm cột revisionReason (lý do yêu cầu chỉnh sửa)
    await queryRunner.query(`
      ALTER TABLE "purchaseRequisition"
      ADD COLUMN "revisionReason" TEXT
    `);

    // Thêm cột revisionRequestedByEmployeeId (người yêu cầu chỉnh sửa)
    await queryRunner.query(`
      ALTER TABLE "purchaseRequisition"
      ADD COLUMN "revisionRequestedByEmployeeId" INTEGER
    `);

    // Thêm cột revisionRequestedAt (thời gian yêu cầu chỉnh sửa)
    await queryRunner.query(`
      ALTER TABLE "purchaseRequisition"
      ADD COLUMN "revisionRequestedAt" TIMESTAMP
    `);

    // Thêm foreign key cho revisionRequestedByEmployeeId
    await queryRunner.query(`
      ALTER TABLE "purchaseRequisition"
      ADD CONSTRAINT "FK_purchaseRequisition_revisionRequestedBy"
      FOREIGN KEY ("revisionRequestedByEmployeeId") REFERENCES "employee"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa foreign key
    await queryRunner.query(`
      ALTER TABLE "purchaseRequisition"
      DROP CONSTRAINT IF EXISTS "FK_purchaseRequisition_revisionRequestedBy"
    `);

    // Xóa các cột
    await queryRunner.query(`
      ALTER TABLE "purchaseRequisition"
      DROP COLUMN IF EXISTS "revisionRequestedAt"
    `);

    await queryRunner.query(`
      ALTER TABLE "purchaseRequisition"
      DROP COLUMN IF EXISTS "revisionRequestedByEmployeeId"
    `);

    await queryRunner.query(`
      ALTER TABLE "purchaseRequisition"
      DROP COLUMN IF EXISTS "revisionReason"
    `);
  }
}
