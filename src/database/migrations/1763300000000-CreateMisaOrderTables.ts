import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMisaOrderTables1763300000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tạo bảng misaOrder
    await queryRunner.query(`
      CREATE TABLE "misaOrder" (
        "id" SERIAL PRIMARY KEY,
        "orderNumber" VARCHAR(50) NOT NULL,
        "orderDate" DATE NOT NULL,
        "customerName" VARCHAR(255) NOT NULL,
        "customerPhone" VARCHAR(20),
        "customerAddress" TEXT,
        "customerTaxCode" VARCHAR(50),

        "createdByEmployeeId" INTEGER NOT NULL,
        "approvedByEmployeeId" INTEGER,
        "approvedAt" TIMESTAMP,
        "assignedToEmployeeId" INTEGER,
        "assignedAt" TIMESTAMP,

        "status" VARCHAR(20) NOT NULL,
        "factoryId" INTEGER NOT NULL,
        "paymentTerms" TEXT,

        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,

        CONSTRAINT "FK_misaOrder_createdBy" FOREIGN KEY ("createdByEmployeeId")
          REFERENCES "employee"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_misaOrder_approvedBy" FOREIGN KEY ("approvedByEmployeeId")
          REFERENCES "employee"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_misaOrder_assignedTo" FOREIGN KEY ("assignedToEmployeeId")
          REFERENCES "employee"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_misaOrder_factory" FOREIGN KEY ("factoryId")
          REFERENCES "factory"("id") ON DELETE CASCADE
      )
    `);

    // Tạo index cho các trường thường query
    await queryRunner.query(`
      CREATE INDEX "IDX_misaOrder_status" ON "misaOrder"("status");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_misaOrder_createdBy" ON "misaOrder"("createdByEmployeeId");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_misaOrder_assignedTo" ON "misaOrder"("assignedToEmployeeId");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_misaOrder_factory" ON "misaOrder"("factoryId");
    `);

    // Tạo bảng misaOrderItem
    await queryRunner.query(`
      CREATE TABLE "misaOrderItem" (
        "id" SERIAL PRIMARY KEY,
        "misaOrderId" INTEGER NOT NULL,
        "productCode" VARCHAR(100),
        "productName" VARCHAR(500) NOT NULL,
        "unit" VARCHAR(50),
        "quantity" DECIMAL(10, 2) NOT NULL,
        "unitPrice" DECIMAL(15, 2),
        "totalPrice" DECIMAL(15, 2),
        "notes" TEXT,

        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,

        CONSTRAINT "FK_misaOrderItem_order" FOREIGN KEY ("misaOrderId")
          REFERENCES "misaOrder"("id") ON DELETE CASCADE
      )
    `);

    // Tạo index cho misa_order_item
    await queryRunner.query(`
      CREATE INDEX "IDX_misaOrderItem_order" ON "misaOrderItem"("misaOrderId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_misaOrderItem_order"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_misa_order_factory"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_misaOrder_assignedTo"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_misaOrder_createdBy"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_misaOrder_status"`);

    // Xóa bảng
    await queryRunner.query(`DROP TABLE IF EXISTS "misaOrderItem"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "misaOrder"`);
  }
}
