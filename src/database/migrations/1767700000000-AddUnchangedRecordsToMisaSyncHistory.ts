import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnchangedRecordsToMisaSyncHistory1767700000000
  implements MigrationInterface
{
  name = 'AddUnchangedRecordsToMisaSyncHistory1767700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Thêm cột unchangedRecords để lưu số bản ghi không thay đổi khi sync
    await queryRunner.query(`
      ALTER TABLE "misaSyncHistory"
      ADD COLUMN IF NOT EXISTS "unchangedRecords" integer DEFAULT 0
    `);

    // Thêm cột changedDetails để lưu chi tiết các bản ghi đã thay đổi
    await queryRunner.query(`
      ALTER TABLE "misaSyncHistory"
      ADD COLUMN IF NOT EXISTS "changedDetails" jsonb DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "misaSyncHistory" DROP COLUMN IF EXISTS "changedDetails"`,
    );
    await queryRunner.query(
      `ALTER TABLE "misaSyncHistory" DROP COLUMN IF EXISTS "unchangedRecords"`,
    );
  }
}
