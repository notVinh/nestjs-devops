import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRequestBodyTemplateToMisaDataSource1768000000000 implements MigrationInterface {
  name = 'AddRequestBodyTemplateToMisaDataSource1768000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add requestBodyTemplate column to misaDataSource table
    await queryRunner.query(`
      ALTER TABLE "misaDataSource"
      ADD COLUMN IF NOT EXISTS "requestBodyTemplate" JSONB
    `);

    // Add comment
    await queryRunner.query(`
      COMMENT ON COLUMN "misaDataSource"."requestBodyTemplate" IS 'Full request body template as JSON. If set, this takes priority over individual fields (view, dataType, filter, sort, etc.)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "misaDataSource"
      DROP COLUMN IF EXISTS "requestBodyTemplate"
    `);
  }
}
