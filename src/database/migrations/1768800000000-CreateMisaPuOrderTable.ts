import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMisaPuOrderTable1768800000000 implements MigrationInterface {
  name = 'CreateMisaPuOrderTable1768800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create misaPuOrder table (Đơn mua hàng - Purchase Order)
    await queryRunner.query(`
      CREATE TABLE "misaPuOrder" (
        "id" BIGSERIAL NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,

        -- Định danh MISA
        "refId" UUID NOT NULL,
        "refNo" VARCHAR(50) NOT NULL,
        "refType" INTEGER NOT NULL DEFAULT 301,
        "refOrder" BIGINT,

        -- Thông tin đơn mua hàng
        "refDate" DATE NOT NULL,
        "status" INTEGER NOT NULL DEFAULT 0,
        "journalMemo" TEXT,

        -- Nhà cung cấp (Account Object)
        "accountObjectId" UUID,
        "accountObjectCode" VARCHAR(50),
        "accountObjectName" VARCHAR(255),
        "accountObjectAddress" TEXT,
        "accountObjectTaxCode" VARCHAR(50),

        -- Nhân viên phụ trách
        "employeeId" UUID,
        "employeeName" VARCHAR(255),

        -- Chi nhánh
        "branchId" UUID,
        "branchName" VARCHAR(255),

        -- Tiền tệ & Tỷ giá
        "currencyId" VARCHAR(10) NOT NULL DEFAULT 'VND',
        "exchangeRate" DECIMAL(18,4) NOT NULL DEFAULT 1,

        -- Số tiền
        "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "totalAmountOc" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "totalOrderAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "alreadyDoneAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,

        -- Thuế VAT
        "totalVatAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "totalVatAmountOc" DECIMAL(18,2) NOT NULL DEFAULT 0,

        -- Chiết khấu
        "discountType" INTEGER NOT NULL DEFAULT 0,
        "discountRateVoucher" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "totalDiscountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "totalDiscountAmountOc" DECIMAL(18,2) NOT NULL DEFAULT 0,

        -- Trạng thái tạo chứng từ liên quan
        "isCreatedPuContract" BOOLEAN NOT NULL DEFAULT false,
        "isCreatedPuService" BOOLEAN NOT NULL DEFAULT false,
        "isCreatedPuMultiple" BOOLEAN NOT NULL DEFAULT false,

        -- Thông tin bổ sung
        "wesignDocumentText" TEXT,

        -- Người tạo/sửa
        "createdBy" VARCHAR(255),
        "modifiedBy" VARCHAR(255),

        -- Timestamps từ MISA
        "misaCreatedDate" TIMESTAMP WITH TIME ZONE,
        "misaModifiedDate" TIMESTAMP WITH TIME ZONE,
        "editVersion" BIGINT,

        CONSTRAINT "PK_misaPuOrder" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_misaPuOrder_refId" UNIQUE ("refId")
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX "IDX_misaPuOrder_refId" ON "misaPuOrder" ("refId")`);
    await queryRunner.query(`CREATE INDEX "IDX_misaPuOrder_refNo" ON "misaPuOrder" ("refNo")`);
    await queryRunner.query(`CREATE INDEX "IDX_misaPuOrder_refDate" ON "misaPuOrder" ("refDate")`);
    await queryRunner.query(`CREATE INDEX "IDX_misaPuOrder_status" ON "misaPuOrder" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_misaPuOrder_accountObjectId" ON "misaPuOrder" ("accountObjectId")`);
    await queryRunner.query(`CREATE INDEX "IDX_misaPuOrder_accountObjectCode" ON "misaPuOrder" ("accountObjectCode")`);

    // Add comment
    await queryRunner.query(`
      COMMENT ON TABLE "misaPuOrder" IS 'Bảng lưu trữ đơn mua hàng (Purchase Order) từ MISA - API: pu_order/paging_filter_v2'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_misaPuOrder_accountObjectCode"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_misaPuOrder_accountObjectId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_misaPuOrder_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_misaPuOrder_refDate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_misaPuOrder_refNo"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_misaPuOrder_refId"`);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "misaPuOrder"`);
  }
}
