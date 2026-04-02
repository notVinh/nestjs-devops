import { MigrationInterface, QueryRunner } from "typeorm";

export class ManualCreateInventoryBalance1775098000000 implements MigrationInterface {
    name = 'ManualCreateInventoryBalance1775098000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Just in case there are remnants
        await queryRunner.query(`DROP TABLE IF EXISTS "misaInventoryBalance"`);

        await queryRunner.query(`
            CREATE TABLE "misaInventoryBalance" (
                "id" BIGSERIAL NOT NULL, 
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "deletedAt" TIMESTAMP, 
                "recordId" character varying(150) NOT NULL, 
                "stockId" uuid NOT NULL, 
                "stockCode" character varying(100) NOT NULL, 
                "stockName" character varying(255) NOT NULL, 
                "inventoryItemId" uuid NOT NULL, 
                "inventoryItemCode" character varying(100) NOT NULL, 
                "inventoryItemName" character varying(500) NOT NULL, 
                "unitName" character varying(100), 
                "inventoryCategoryName" character varying(255), 
                "inventoryItemSource" character varying(255), 
                "openingQuantity" numeric(18,2) NOT NULL DEFAULT '0', 
                "closingQuantity" numeric(18,2) NOT NULL DEFAULT '0', 
                "totalInQuantity" numeric(18,2) NOT NULL DEFAULT '0', 
                "totalOutQuantity" numeric(18,2) NOT NULL DEFAULT '0', 
                "openingAmount" numeric(18,2) NOT NULL DEFAULT '0', 
                "closingAmount" numeric(18,2) NOT NULL DEFAULT '0', 
                "totalInAmount" numeric(18,2) NOT NULL DEFAULT '0', 
                "totalOutAmount" numeric(18,2) NOT NULL DEFAULT '0', 
                "purchaseQuantity" numeric(18,2) NOT NULL DEFAULT '0', 
                "saleQuantity" numeric(18,2) NOT NULL DEFAULT '0', 
                "fromDate" TIMESTAMP WITH TIME ZONE, 
                "toDate" TIMESTAMP WITH TIME ZONE, 
                "syncedAt" TIMESTAMP WITH TIME ZONE, 
                CONSTRAINT "UQ_inventory_balance_record_id" UNIQUE ("recordId"), 
                CONSTRAINT "PK_inventory_balance_id" PRIMARY KEY ("id")
            )
        `);

        // Add indexes for performance, matching the entity definition
        await queryRunner.query(`CREATE INDEX "IDX_inventory_balance_stockId" ON "misaInventoryBalance" ("stockId")`);
        await queryRunner.query(`CREATE INDEX "IDX_inventory_balance_inventoryItemId" ON "misaInventoryBalance" ("inventoryItemId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "misaInventoryBalance"`);
    }
}
