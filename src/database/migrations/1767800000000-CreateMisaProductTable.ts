import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMisaProductTable1767800000000 implements MigrationInterface {
  name = 'CreateMisaProductTable1767800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create misaProduct table
    await queryRunner.query(`
      CREATE TABLE "misaProduct" (
        "id" BIGSERIAL NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "inventoryItemId" UUID NOT NULL,
        "inventoryItemCode" VARCHAR(100) NOT NULL,
        "inventoryItemName" VARCHAR(500) NOT NULL,
        "inventoryItemType" INTEGER NOT NULL DEFAULT 0,
        "unitId" UUID,
        "unitName" VARCHAR(100),
        "unitPrice" DECIMAL(18,4) NOT NULL DEFAULT 0,
        "salePrice1" DECIMAL(18,4) NOT NULL DEFAULT 0,
        "salePrice2" DECIMAL(18,4) NOT NULL DEFAULT 0,
        "salePrice3" DECIMAL(18,4) NOT NULL DEFAULT 0,
        "fixedSalePrice" DECIMAL(18,4) NOT NULL DEFAULT 0,
        "fixedUnitPrice" DECIMAL(18,4) NOT NULL DEFAULT 0,
        "saleDescription" TEXT,
        "purchaseDescription" TEXT,
        "image" VARCHAR(500),
        "branchId" UUID,
        "branchName" VARCHAR(255),
        "inactive" BOOLEAN NOT NULL DEFAULT false,
        "minimumStock" DECIMAL(18,4) NOT NULL DEFAULT 0,
        "closingQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
        "closingAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
        "inventoryAccount" VARCHAR(50),
        "cogsAccount" VARCHAR(50),
        "saleAccount" VARCHAR(50),
        "returnAccount" VARCHAR(50),
        "discountAccount" VARCHAR(50),
        "saleOffAccount" VARCHAR(50),
        "inventoryItemSource" VARCHAR(100),
        "inventoryItemCategoryIdList" TEXT,
        "inventoryItemCategoryCodeList" TEXT,
        "inventoryItemCategoryNameList" TEXT,
        "inventoryItemCategoryMisaCodeList" TEXT,
        "isFollowSerialNumber" BOOLEAN NOT NULL DEFAULT false,
        "isDrug" BOOLEAN NOT NULL DEFAULT false,
        "isSystem" BOOLEAN NOT NULL DEFAULT false,
        "inventoryItemCostMethod" INTEGER NOT NULL DEFAULT -1,
        "specificProductType" INTEGER NOT NULL DEFAULT 0,
        "exportTaxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "importTaxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "taxReductionType" INTEGER NOT NULL DEFAULT -1,
        "discountType" INTEGER NOT NULL DEFAULT 0,
        "purchaseDiscountRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "createdBy" VARCHAR(255),
        "modifiedBy" VARCHAR(255),
        "misaCreatedDate" TIMESTAMP WITH TIME ZONE,
        "misaModifiedDate" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_misaProduct" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_misaProduct_inventoryItemId" UNIQUE ("inventoryItemId")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_misaProduct_inventoryItemId" ON "misaProduct" ("inventoryItemId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_misaProduct_inventoryItemCode" ON "misaProduct" ("inventoryItemCode")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_misaProduct_inventoryItemName" ON "misaProduct" ("inventoryItemName")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_misaProduct_inventoryItemType" ON "misaProduct" ("inventoryItemType")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_misaProduct_inactive" ON "misaProduct" ("inactive")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "public"."IDX_misaProduct_inactive"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_misaProduct_inventoryItemType"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_misaProduct_inventoryItemName"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_misaProduct_inventoryItemCode"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_misaProduct_inventoryItemId"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "misaProduct"`);
  }
}
