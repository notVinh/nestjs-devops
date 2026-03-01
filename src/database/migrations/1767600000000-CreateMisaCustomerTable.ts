import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMisaCustomerTable1767600000000 implements MigrationInterface {
  name = 'CreateMisaCustomerTable1767600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create misaCustomer table
    await queryRunner.query(`
      CREATE TABLE "misaCustomer" (
        "id" BIGSERIAL NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "accountObjectId" UUID NOT NULL,
        "accountObjectCode" VARCHAR(100) NOT NULL,
        "accountObjectName" VARCHAR(500) NOT NULL,
        "address" TEXT,
        "taxCode" VARCHAR(50),
        "tel" VARCHAR(50),
        "country" VARCHAR(100),
        "provinceOrCity" VARCHAR(100),
        "district" VARCHAR(100),
        "wardOrCommune" VARCHAR(100),
        "contactName" VARCHAR(255),
        "contactMobile" VARCHAR(50),
        "contactEmail" VARCHAR(255),
        "legalRepresentative" VARCHAR(255),
        "invoiceReceiver" VARCHAR(255),
        "invoiceReceiverPhone" VARCHAR(50),
        "invoiceReceiverEmail" VARCHAR(255),
        "shippingAddresses" JSONB,
        "accountObjectType" INTEGER NOT NULL DEFAULT 0,
        "isCustomer" BOOLEAN NOT NULL DEFAULT true,
        "isVendor" BOOLEAN NOT NULL DEFAULT false,
        "inactive" BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT "PK_misaCustomer" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_misaCustomer_accountObjectId" UNIQUE ("accountObjectId")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_misaCustomer_accountObjectId" ON "misaCustomer" ("accountObjectId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_misaCustomer_accountObjectCode" ON "misaCustomer" ("accountObjectCode")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_misaCustomer_accountObjectName" ON "misaCustomer" ("accountObjectName")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_misaCustomer_isCustomer" ON "misaCustomer" ("isCustomer")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "public"."IDX_misaCustomer_isCustomer"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_misaCustomer_accountObjectName"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_misaCustomer_accountObjectCode"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_misaCustomer_accountObjectId"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "misaCustomer"`);
  }
}
