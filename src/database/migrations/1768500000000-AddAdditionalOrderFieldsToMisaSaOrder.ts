import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdditionalOrderFieldsToMisaSaOrder1768500000000
  implements MigrationInterface
{
  name = 'AddAdditionalOrderFieldsToMisaSaOrder1768500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Thêm trường needsAdditionalOrder (có cần đặt thêm hàng không)
    await queryRunner.query(`
      ALTER TABLE "misaSaOrder"
      ADD COLUMN IF NOT EXISTS "needsAdditionalOrder" boolean NOT NULL DEFAULT false
    `);

    // Thêm trường additionalOrderNote (nội dung ghi chú đặt thêm hàng)
    await queryRunner.query(`
      ALTER TABLE "misaSaOrder"
      ADD COLUMN IF NOT EXISTS "additionalOrderNote" text NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "misaSaOrder" DROP COLUMN IF EXISTS "additionalOrderNote"
    `);
    await queryRunner.query(`
      ALTER TABLE "misaSaOrder" DROP COLUMN IF EXISTS "needsAdditionalOrder"
    `);
  }
}
