import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExpectedDeliveryDateToPurchaseOrder1765200000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Thêm cột expectedDeliveryDate
    await queryRunner.query(`
      ALTER TABLE "purchaseOrder"
      ADD COLUMN IF NOT EXISTS "expectedDeliveryDate" DATE NULL
    `);

    // 2. Thêm cột daysUntilDelivery (số ngày còn lại đến khi hàng về)
    await queryRunner.query(`
      ALTER TABLE "purchaseOrder"
      ADD COLUMN IF NOT EXISTS "daysUntilDelivery" INTEGER NULL
    `);

    // 3. Đổi tên cột approvedByEmployeeId -> confirmedByEmployeeId
    await queryRunner.query(`
      ALTER TABLE "purchaseOrder"
      RENAME COLUMN "approvedByEmployeeId" TO "confirmedByEmployeeId"
    `);

    // 4. Đổi tên cột approvedAt -> confirmedAt
    await queryRunner.query(`
      ALTER TABLE "purchaseOrder"
      RENAME COLUMN "approvedAt" TO "confirmedAt"
    `);

    // 5. Cập nhật status từ pendingApproval -> pending
    await queryRunner.query(`
      UPDATE "purchaseOrder"
      SET "status" = 'pending'
      WHERE "status" = 'pendingApproval'
    `);

    // 6. Cập nhật status từ approved -> waiting
    await queryRunner.query(`
      UPDATE "purchaseOrder"
      SET "status" = 'waiting'
      WHERE "status" = 'approved'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback status waiting -> approved
    await queryRunner.query(`
      UPDATE "purchaseOrder"
      SET "status" = 'approved'
      WHERE "status" = 'waiting'
    `);

    // Rollback status pending -> pendingApproval
    await queryRunner.query(`
      UPDATE "purchaseOrder"
      SET "status" = 'pendingApproval'
      WHERE "status" = 'pending'
    `);

    // Đổi tên cột confirmedAt -> approvedAt
    await queryRunner.query(`
      ALTER TABLE "purchaseOrder"
      RENAME COLUMN "confirmedAt" TO "approvedAt"
    `);

    // Đổi tên cột confirmedByEmployeeId -> approvedByEmployeeId
    await queryRunner.query(`
      ALTER TABLE "purchaseOrder"
      RENAME COLUMN "confirmedByEmployeeId" TO "approvedByEmployeeId"
    `);

    // Xóa cột daysUntilDelivery
    await queryRunner.query(`
      ALTER TABLE "purchaseOrder"
      DROP COLUMN IF EXISTS "daysUntilDelivery"
    `);

    // Xóa cột expectedDeliveryDate
    await queryRunner.query(`
      ALTER TABLE "purchaseOrder"
      DROP COLUMN IF EXISTS "expectedDeliveryDate"
    `);
  }
}
