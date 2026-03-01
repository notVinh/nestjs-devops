import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeepLinkingToNotification1762800000000
  implements MigrationInterface
{
  name = 'AddDeepLinkingToNotification1762800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns for deep linking
    await queryRunner.query(`
      ALTER TABLE "notification"
      ADD COLUMN IF NOT EXISTS "type" CHARACTER VARYING(100),
      ADD COLUMN IF NOT EXISTS "referenceId" BIGINT,
      ADD COLUMN IF NOT EXISTS "metadata" JSONB
    `);

    // Create indexes for better query performance
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notification_type" ON "notification" ("type")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notification_reference" ON "notification" ("referenceId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_reference"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_type"`);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE "notification"
      DROP COLUMN IF EXISTS "metadata",
      DROP COLUMN IF EXISTS "referenceId",
      DROP COLUMN IF EXISTS "type"
    `);
  }
}
