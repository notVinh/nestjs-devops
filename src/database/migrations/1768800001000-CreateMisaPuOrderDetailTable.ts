import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMisaPuOrderDetailTable1768800001000 implements MigrationInterface {
  name = 'CreateMisaPuOrderDetailTable1768800001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create misaPuOrderDetail table (Chi tiết Đơn mua hàng - Purchase Order Detail)
    await queryRunner.query(`
      CREATE TABLE "misaPuOrderDetail" (
        "id" BIGSERIAL NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,

        -- Liên kết với đơn mua hàng
        "refId" UUID NOT NULL,

        -- Thông tin sản phẩm
        "inventoryItemCode" VARCHAR(50),
        "description" TEXT,
        "stockCode" VARCHAR(50),
        "unitName" VARCHAR(50),

        -- Số lượng
        "quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
        "quantityReceipt" DECIMAL(18,4) NOT NULL DEFAULT 0,

        -- Giá & Tiền
        "unitPrice" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "amountOc" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "vatAmountOc" DECIMAL(18,2) NOT NULL DEFAULT 0,

        -- Thông tin bổ sung
        "isDescription" BOOLEAN NOT NULL DEFAULT false,

        -- Thứ tự dòng
        "sortOrder" INTEGER NOT NULL DEFAULT 0,

        CONSTRAINT "PK_misaPuOrderDetail" PRIMARY KEY ("id"),
        CONSTRAINT "FK_misaPuOrderDetail_refId" FOREIGN KEY ("refId")
          REFERENCES "misaPuOrder"("refId") ON DELETE CASCADE
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX "IDX_misaPuOrderDetail_refId" ON "misaPuOrderDetail" ("refId")`);
    await queryRunner.query(`CREATE INDEX "IDX_misaPuOrderDetail_inventoryItemCode" ON "misaPuOrderDetail" ("inventoryItemCode")`);

    // Add comment
    await queryRunner.query(`
      COMMENT ON TABLE "misaPuOrderDetail" IS 'Bảng lưu trữ chi tiết đơn mua hàng (Purchase Order Detail) từ MISA - API: pu_order/get_paging_detail'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_misaPuOrderDetail_inventoryItemCode"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_misaPuOrderDetail_refId"`);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "misaPuOrderDetail"`);
  }
}
