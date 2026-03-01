import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMisaCurlTables1767400000000 implements MigrationInterface {
  name = 'CreateMisaCurlTables1767400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create misaApiConfig table
    await queryRunner.query(`
      CREATE TABLE "misaApiConfig" (
        "id" BIGSERIAL NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "name" VARCHAR(100) NOT NULL DEFAULT 'Default',
        "baseUrl" VARCHAR(500) NOT NULL,
        "tenantId" VARCHAR(100) NOT NULL,
        "tenantCode" VARCHAR(50) NOT NULL,
        "databaseId" VARCHAR(100) NOT NULL,
        "branchId" VARCHAR(100),
        "userId" VARCHAR(100),
        "workingBook" INTEGER NOT NULL DEFAULT 0,
        "language" VARCHAR(10) NOT NULL DEFAULT 'vi',
        "includeDependentBranch" VARCHAR(10) NOT NULL DEFAULT 'false',
        "dbType" INTEGER NOT NULL DEFAULT 1,
        "authType" INTEGER NOT NULL DEFAULT 0,
        "hasAgent" BOOLEAN NOT NULL DEFAULT false,
        "userType" INTEGER NOT NULL DEFAULT 1,
        "art" INTEGER NOT NULL DEFAULT 1,
        "isc" BOOLEAN NOT NULL DEFAULT false,
        "deviceId" VARCHAR(100),
        "cookies" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT "PK_misaApiConfig" PRIMARY KEY ("id")
      )
    `);

    // 2. Create misaDataSource table
    await queryRunner.query(`
      CREATE TABLE "misaDataSource" (
        "id" BIGSERIAL NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "apiConfigId" BIGINT,
        "name" VARCHAR(100) NOT NULL,
        "code" VARCHAR(50) NOT NULL,
        "description" TEXT,
        "icon" VARCHAR(50),
        "apiEndpoint" VARCHAR(500),
        "view" VARCHAR(100) NOT NULL,
        "dataType" VARCHAR(100) NOT NULL,
        "defaultFilter" TEXT,
        "defaultSort" TEXT,
        "useSp" BOOLEAN NOT NULL DEFAULT false,
        "isGetTotal" BOOLEAN NOT NULL DEFAULT true,
        "isFilterBranch" BOOLEAN NOT NULL DEFAULT false,
        "isMultiBranch" BOOLEAN NOT NULL DEFAULT true,
        "isDependent" BOOLEAN NOT NULL DEFAULT false,
        "loadMode" INTEGER NOT NULL DEFAULT 2,
        "pageSize" INTEGER NOT NULL DEFAULT 100,
        "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
        "displayOrder" INTEGER NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT "PK_misaDataSource" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_misaDataSource_code" UNIQUE ("code")
      )
    `);

    // 3. Create misaSyncHistory table
    await queryRunner.query(`
      CREATE TABLE "misaSyncHistory" (
        "id" BIGSERIAL NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "dataSourceId" BIGINT NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
        "source" VARCHAR(20) NOT NULL DEFAULT 'manual',
        "startedAt" TIMESTAMP,
        "completedAt" TIMESTAMP,
        "totalRecords" INTEGER NOT NULL DEFAULT 0,
        "syncedRecords" INTEGER NOT NULL DEFAULT 0,
        "createdRecords" INTEGER NOT NULL DEFAULT 0,
        "updatedRecords" INTEGER NOT NULL DEFAULT 0,
        "errorMessage" TEXT,
        "logs" JSONB NOT NULL DEFAULT '[]',
        "lastRequest" JSONB,
        "lastResponseSample" JSONB,
        CONSTRAINT "PK_misaSyncHistory" PRIMARY KEY ("id")
      )
    `);

    // 4. Add foreign keys
    await queryRunner.query(`
      ALTER TABLE "misaDataSource"
      ADD CONSTRAINT "FK_misaDataSource_apiConfig"
      FOREIGN KEY ("apiConfigId") REFERENCES "misaApiConfig"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "misaSyncHistory"
      ADD CONSTRAINT "FK_misaSyncHistory_dataSource"
      FOREIGN KEY ("dataSourceId") REFERENCES "misaDataSource"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // 5. Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_misaDataSource_code" ON "misaDataSource" ("code")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_misaDataSource_isActive" ON "misaDataSource" ("isActive")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_misaSyncHistory_dataSourceId" ON "misaSyncHistory" ("dataSourceId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_misaSyncHistory_status" ON "misaSyncHistory" ("status")
    `);

    // 6. Insert default data for data sources
    await queryRunner.query(`
      INSERT INTO "misaDataSource" ("name", "code", "icon", "view", "dataType", "defaultFilter", "defaultSort", "displayOrder")
      VALUES
        ('Khách hàng', 'customer', 'Users', 'view_account_object_customer', 'di_customer',
         '[["is_customer","=",true],"and",["is_employee","=",false]]',
         '[{"property":"account_object_code","desc":false}]', 1),
        ('Sản phẩm', 'product', 'Package', 'view_inventory_item', 'di_inventory_item',
         '[]',
         '[{"property":"inventory_item_code","desc":false}]', 2),
        ('Đơn bán hàng', 'sales_order', 'ShoppingCart', 'view_sa_order', 'sa_order',
         '[]',
         '[{"property":"ref_date","desc":true}]', 3),
        ('Đơn mua hàng', 'pu_order', 'Truck', 'view_pu_order', 'pu_order',
         '[]',
         '[{"property":"ref_date","desc":true}]', 4)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    await queryRunner.query(`
      ALTER TABLE "misaSyncHistory" DROP CONSTRAINT "FK_misaSyncHistory_dataSource"
    `);
    await queryRunner.query(`
      ALTER TABLE "misaDataSource" DROP CONSTRAINT "FK_misaDataSource_apiConfig"
    `);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "public"."IDX_misaSyncHistory_status"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_misaSyncHistory_dataSourceId"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_misaDataSource_isActive"`
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_misaDataSource_code"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "misaSyncHistory"`);
    await queryRunner.query(`DROP TABLE "misaDataSource"`);
    await queryRunner.query(`DROP TABLE "misaApiConfig"`);
  }
}
