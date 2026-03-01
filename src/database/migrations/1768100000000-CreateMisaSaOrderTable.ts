import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMisaSaOrderTable1768100000000 implements MigrationInterface {
  name = 'CreateMisaSaOrderTable1768100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create misaSaOrder table
    await queryRunner.query(`
      CREATE TABLE "misaSaOrder" (
        "id" BIGSERIAL NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,

        -- Định danh MISA
        "refId" UUID NOT NULL,
        "refNo" VARCHAR(50) NOT NULL,
        "refType" INTEGER NOT NULL DEFAULT 3520,
        "crmId" VARCHAR(20),

        -- Thông tin đơn hàng
        "refDate" DATE NOT NULL,
        "status" INTEGER NOT NULL DEFAULT 0,
        "journalMemo" TEXT,

        -- Khách hàng
        "accountObjectId" UUID,
        "accountObjectCode" VARCHAR(50),
        "accountObjectName" VARCHAR(255),
        "accountObjectAddress" TEXT,
        "accountObjectTaxCode" VARCHAR(50),

        -- Chi nhánh
        "branchId" UUID,
        "branchName" VARCHAR(255),

        -- Tiền tệ & Tài chính
        "currencyId" VARCHAR(10) NOT NULL DEFAULT 'VND',
        "totalAmountOc" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "totalSaleAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "totalSaleAmountOc" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "totalVatAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "totalDiscountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "totalDiscountAmountOc" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "receivableAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "receivableAmountOc" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "receiptedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "receiptedAmountOc" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "totalReceiptedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "totalReceiptedAmountOc" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "payRefundAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "payRefundAmountOc" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "totalInvoiceAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "totalInvoiceAmountOc" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "receiptAmountFinance" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "receiptAmountOcFinance" DECIMAL(18,2) NOT NULL DEFAULT 0,

        -- Trạng thái
        "deliveredStatus" INTEGER NOT NULL DEFAULT 0,
        "revenueStatus" INTEGER NOT NULL DEFAULT 0,
        "isInvoiced" BOOLEAN NOT NULL DEFAULT false,
        "isInvoiceEnum" INTEGER NOT NULL DEFAULT 0,
        "isCreateVoucher" BOOLEAN NOT NULL DEFAULT true,
        "isCalculatedCost" BOOLEAN NOT NULL DEFAULT true,
        "hasCreateContract" BOOLEAN NOT NULL DEFAULT false,
        "isArisedBeforeUseSoftware" BOOLEAN NOT NULL DEFAULT false,

        -- Thông tin bổ sung
        "wesignDocumentText" TEXT,

        -- Người tạo/sửa
        "createdBy" VARCHAR(255),
        "modifiedBy" VARCHAR(255),
        "employeeName" VARCHAR(255),

        -- Timestamps từ MISA
        "misaCreatedDate" TIMESTAMP WITH TIME ZONE,
        "misaModifiedDate" TIMESTAMP WITH TIME ZONE,
        "editVersion" BIGINT,

        CONSTRAINT "PK_misaSaOrder" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_misaSaOrder_refId" UNIQUE ("refId")
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX "IDX_misaSaOrder_refId" ON "misaSaOrder" ("refId")`);
    await queryRunner.query(`CREATE INDEX "IDX_misaSaOrder_refNo" ON "misaSaOrder" ("refNo")`);
    await queryRunner.query(`CREATE INDEX "IDX_misaSaOrder_refDate" ON "misaSaOrder" ("refDate")`);
    await queryRunner.query(`CREATE INDEX "IDX_misaSaOrder_status" ON "misaSaOrder" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_misaSaOrder_accountObjectId" ON "misaSaOrder" ("accountObjectId")`);
    await queryRunner.query(`CREATE INDEX "IDX_misaSaOrder_accountObjectCode" ON "misaSaOrder" ("accountObjectCode")`);

    // Add comment
    await queryRunner.query(`
      COMMENT ON TABLE "misaSaOrder" IS 'Bảng lưu trữ đơn đặt hàng (Sales Order) từ MISA'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_misaSaOrder_accountObjectCode"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_misaSaOrder_accountObjectId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_misaSaOrder_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_misaSaOrder_refDate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_misaSaOrder_refNo"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_misaSaOrder_refId"`);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "misaSaOrder"`);
  }
}
