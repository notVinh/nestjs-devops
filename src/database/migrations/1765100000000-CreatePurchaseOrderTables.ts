import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePurchaseOrderTables1765100000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tạo bảng purchaseOrder
    await queryRunner.query(`
      CREATE TABLE "purchaseOrder" (
        "id" SERIAL PRIMARY KEY,
        "orderNumber" VARCHAR(50) NOT NULL,
        "orderDate" DATE NOT NULL,
        "supplierName" VARCHAR(255) NOT NULL,
        "supplierPhone" VARCHAR(20),
        "supplierAddress" TEXT,
        "supplierTaxCode" VARCHAR(50),

        "createdByEmployeeId" INTEGER NOT NULL,
        "approvedByEmployeeId" INTEGER,
        "approvedAt" TIMESTAMP,
        "receivedByEmployeeId" INTEGER,
        "receivedAt" TIMESTAMP,
        "completedByEmployeeId" INTEGER,
        "completedAt" TIMESTAMP,

        "status" VARCHAR(20) NOT NULL DEFAULT 'pendingApproval',
        "factoryId" INTEGER NOT NULL,

        "deliveryDate" DATE,
        "deliveryLocation" TEXT,
        "paymentTerms" TEXT,
        "notes" TEXT,
        "photoUrls" JSONB,

        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,

        CONSTRAINT "FK_purchaseOrder_createdBy" FOREIGN KEY ("createdByEmployeeId")
          REFERENCES "employee"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_purchaseOrder_approvedBy" FOREIGN KEY ("approvedByEmployeeId")
          REFERENCES "employee"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_purchaseOrder_receivedBy" FOREIGN KEY ("receivedByEmployeeId")
          REFERENCES "employee"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_purchaseOrder_completedBy" FOREIGN KEY ("completedByEmployeeId")
          REFERENCES "employee"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_purchaseOrder_factory" FOREIGN KEY ("factoryId")
          REFERENCES "factory"("id") ON DELETE CASCADE
      )
    `);

    // Tạo index cho các trường thường query
    await queryRunner.query(`
      CREATE INDEX "IDX_purchaseOrder_status" ON "purchaseOrder"("status");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_purchaseOrder_orderNumber" ON "purchaseOrder"("orderNumber");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_purchaseOrder_createdBy" ON "purchaseOrder"("createdByEmployeeId");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_purchaseOrder_factory" ON "purchaseOrder"("factoryId");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_purchaseOrder_orderDate" ON "purchaseOrder"("orderDate");
    `);

    // Tạo bảng purchaseOrderItem
    await queryRunner.query(`
      CREATE TABLE "purchaseOrderItem" (
        "id" SERIAL PRIMARY KEY,
        "purchaseOrderId" INTEGER NOT NULL,
        "productCode" VARCHAR(100),
        "productName" VARCHAR(500) NOT NULL,
        "unit" VARCHAR(50),
        "quantity" DECIMAL(10, 2) NOT NULL,
        "unitPrice" DECIMAL(15, 2),
        "totalPrice" DECIMAL(15, 2),
        "notes" TEXT,
        "photoUrls" JSONB,

        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,

        CONSTRAINT "FK_purchaseOrderItem_order" FOREIGN KEY ("purchaseOrderId")
          REFERENCES "purchaseOrder"("id") ON DELETE CASCADE
      )
    `);

    // Tạo index cho purchaseOrderItem
    await queryRunner.query(`
      CREATE INDEX "IDX_purchaseOrderItem_order" ON "purchaseOrderItem"("purchaseOrderId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_purchaseOrderItem_order"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_purchaseOrder_orderDate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_purchaseOrder_factory"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_purchaseOrder_createdBy"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_purchaseOrder_orderNumber"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_purchaseOrder_status"`);

    // Xóa bảng
    await queryRunner.query(`DROP TABLE IF EXISTS "purchaseOrderItem"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "purchaseOrder"`);
  }
}
