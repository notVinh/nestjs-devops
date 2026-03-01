import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMisaStockTable1767900000000 implements MigrationInterface {
  name = 'CreateMisaStockTable1767900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create misaStock table
    await queryRunner.query(`
      CREATE TABLE "misaStock" (
        "id" BIGSERIAL NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "stockId" UUID NOT NULL,
        "stockCode" VARCHAR(50) NOT NULL,
        "stockName" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "branchId" UUID,
        "branchName" VARCHAR(255),
        "inactive" BOOLEAN NOT NULL DEFAULT false,
        "isGroup" BOOLEAN NOT NULL DEFAULT false,
        "isValid" BOOLEAN NOT NULL DEFAULT false,
        "inventoryAccount" VARCHAR(50),
        "createdBy" VARCHAR(255),
        "modifiedBy" VARCHAR(255),
        "misaCreatedDate" TIMESTAMP WITH TIME ZONE,
        "misaModifiedDate" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_misaStock" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_misaStock_stockId" UNIQUE ("stockId")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_misaStock_stockId" ON "misaStock" ("stockId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_misaStock_stockCode" ON "misaStock" ("stockCode")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_misaStock_stockName" ON "misaStock" ("stockName")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_misaStock_inactive" ON "misaStock" ("inactive")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "public"."IDX_misaStock_inactive"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_misaStock_stockName"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_misaStock_stockCode"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_misaStock_stockId"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "misaStock"`);
  }
}
