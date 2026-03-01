import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPurchaseConfirmFieldsToPurchaseRequisition1768900000000
  implements MigrationInterface
{
  name = 'AddPurchaseConfirmFieldsToPurchaseRequisition1768900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Thêm cột purchaseConfirmedByEmployeeId (người xác nhận mua hàng)
    await queryRunner.query(`
      ALTER TABLE "purchaseRequisition"
      ADD COLUMN "purchaseConfirmedByEmployeeId" INTEGER
    `);

    // Thêm cột purchaseConfirmedAt (thời gian xác nhận mua hàng)
    await queryRunner.query(`
      ALTER TABLE "purchaseRequisition"
      ADD COLUMN "purchaseConfirmedAt" TIMESTAMP
    `);

    // Thêm cột purchaseConfirmNotes (ghi chú xác nhận mua hàng)
    await queryRunner.query(`
      ALTER TABLE "purchaseRequisition"
      ADD COLUMN "purchaseConfirmNotes" TEXT
    `);

    // Thêm foreign key cho purchaseConfirmedByEmployeeId
    await queryRunner.query(`
      ALTER TABLE "purchaseRequisition"
      ADD CONSTRAINT "FK_purchaseRequisition_purchaseConfirmedBy"
      FOREIGN KEY ("purchaseConfirmedByEmployeeId") REFERENCES "employee"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa foreign key
    await queryRunner.query(`
      ALTER TABLE "purchaseRequisition"
      DROP CONSTRAINT IF EXISTS "FK_purchaseRequisition_purchaseConfirmedBy"
    `);

    // Xóa các cột
    await queryRunner.query(`
      ALTER TABLE "purchaseRequisition"
      DROP COLUMN IF EXISTS "purchaseConfirmNotes"
    `);

    await queryRunner.query(`
      ALTER TABLE "purchaseRequisition"
      DROP COLUMN IF EXISTS "purchaseConfirmedAt"
    `);

    await queryRunner.query(`
      ALTER TABLE "purchaseRequisition"
      DROP COLUMN IF EXISTS "purchaseConfirmedByEmployeeId"
    `);
  }
}
