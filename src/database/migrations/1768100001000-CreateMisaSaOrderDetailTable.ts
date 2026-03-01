import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMisaSaOrderDetailTable1768100001000 implements MigrationInterface {
  name = 'CreateMisaSaOrderDetailTable1768100001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create misaSaOrderDetail table
    await queryRunner.query(`
      CREATE TABLE "misaSaOrderDetail" (
        "id" BIGSERIAL NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,

        -- Liên kết với đơn hàng
        "refId" UUID NOT NULL,

        -- Thông tin sản phẩm
        "inventoryItemCode" VARCHAR(50),
        "description" TEXT,
        "stockCode" VARCHAR(50),
        "unitName" VARCHAR(50),

        -- Số lượng
        "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
        "quantityDeliveredSa" DECIMAL(18,4) NOT NULL DEFAULT 0,
        "quantityDeliveredIn" DECIMAL(18,4) NOT NULL DEFAULT 0,

        -- Giá & Tiền
        "unitPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "amountOc" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "vatAmountOc" DECIMAL(18,2) NOT NULL DEFAULT 0,

        -- Thông tin bổ sung
        "organizationUnitCode" VARCHAR(50),
        "isCombo" BOOLEAN NOT NULL DEFAULT false,
        "isDescription" BOOLEAN NOT NULL DEFAULT false,

        -- Thứ tự dòng
        "sortOrder" INTEGER NOT NULL DEFAULT 0,

        CONSTRAINT "PK_misaSaOrderDetail" PRIMARY KEY ("id"),
        CONSTRAINT "FK_misaSaOrderDetail_refId" FOREIGN KEY ("refId")
          REFERENCES "misaSaOrder"("refId") ON DELETE CASCADE
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX "IDX_misaSaOrderDetail_refId" ON "misaSaOrderDetail" ("refId")`);
    await queryRunner.query(`CREATE INDEX "IDX_misaSaOrderDetail_inventoryItemCode" ON "misaSaOrderDetail" ("inventoryItemCode")`);

    // Add comment
    await queryRunner.query(`
      COMMENT ON TABLE "misaSaOrderDetail" IS 'Bảng lưu trữ chi tiết đơn đặt hàng (Sales Order Detail) từ MISA'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_misaSaOrderDetail_inventoryItemCode"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_misaSaOrderDetail_refId"`);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "misaSaOrderDetail"`);
  }
}
