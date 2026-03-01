import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMisaDataSourceExtraFields1767500000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add stockItemState column
    await queryRunner.query(`
      ALTER TABLE "misaDataSource"
      ADD COLUMN IF NOT EXISTS "stockItemState" integer
    `);

    // Add summaryColumns column
    await queryRunner.query(`
      ALTER TABLE "misaDataSource"
      ADD COLUMN IF NOT EXISTS "summaryColumns" varchar(500)
    `);

    // Add extraParams column (JSONB for flexible extra params)
    await queryRunner.query(`
      ALTER TABLE "misaDataSource"
      ADD COLUMN IF NOT EXISTS "extraParams" jsonb
    `);

    // Update product data source with correct config
    await queryRunner.query(`
      UPDATE "misaDataSource"
      SET
        "view" = 'view_di_inventory_item',
        "dataType" = 'di_inventory_item',
        "defaultSort" = '[{"property":"inventory_item_code","desc":false}]',
        "defaultFilter" = NULL,
        "stockItemState" = -1,
        "summaryColumns" = ',closing_amount'
      WHERE "code" = 'product'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "misaDataSource" DROP COLUMN IF EXISTS "stockItemState"
    `);
    await queryRunner.query(`
      ALTER TABLE "misaDataSource" DROP COLUMN IF EXISTS "summaryColumns"
    `);
    await queryRunner.query(`
      ALTER TABLE "misaDataSource" DROP COLUMN IF EXISTS "extraParams"
    `);
  }
}
