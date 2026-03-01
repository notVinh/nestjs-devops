import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePurchaseRequisitionTable1765300000000
  implements MigrationInterface
{
  name = 'CreatePurchaseRequisitionTable1765300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tạo bảng purchaseRequisition (Đề xuất mua hàng)
    await queryRunner.query(`
      CREATE TABLE "purchaseRequisition" (
        "id" SERIAL PRIMARY KEY,
        "requisitionNumber" VARCHAR(50) NOT NULL,
        "misaOrderId" INTEGER NOT NULL,
        "factoryId" INTEGER NOT NULL,
        "notes" TEXT,

        -- Người tạo đề xuất (người hoàn thành inventory check)
        "createdByEmployeeId" INTEGER NOT NULL,

        -- Người duyệt đề xuất
        "approvedByEmployeeId" INTEGER,
        "approvedAt" TIMESTAMP,
        "approvalNotes" TEXT,

        -- Status: pending (chờ duyệt), approved (đã duyệt), rejected (từ chối)
        "status" VARCHAR(20) NOT NULL DEFAULT 'pending',

        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,

        CONSTRAINT "FK_purchaseRequisition_misaOrder" FOREIGN KEY ("misaOrderId") REFERENCES "misaOrder"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_purchaseRequisition_factory" FOREIGN KEY ("factoryId") REFERENCES "factory"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_purchaseRequisition_createdBy" FOREIGN KEY ("createdByEmployeeId") REFERENCES "employee"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_purchaseRequisition_approvedBy" FOREIGN KEY ("approvedByEmployeeId") REFERENCES "employee"("id") ON DELETE SET NULL
      )
    `);

    // Tạo indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_purchaseRequisition_misaOrderId" ON "purchaseRequisition" ("misaOrderId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_purchaseRequisition_factoryId" ON "purchaseRequisition" ("factoryId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_purchaseRequisition_status" ON "purchaseRequisition" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_purchaseRequisition_createdAt" ON "purchaseRequisition" ("createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "purchaseRequisition"`);
  }
}
