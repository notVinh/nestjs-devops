import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSourceFieldToMisaSaOrder1768400000000 implements MigrationInterface {
  name = 'AddSourceFieldToMisaSaOrder1768400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Thêm trường source để phân biệt đơn từ MISA vs đơn tạo thủ công
    await queryRunner.query(`
      ALTER TABLE "misaSaOrder"
      ADD COLUMN IF NOT EXISTS "source" VARCHAR(20) DEFAULT 'misa'
    `);

    // Tạo index cho source để tìm kiếm nhanh
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_misaSaOrder_source" ON "misaSaOrder" ("source")
    `);

    // Cập nhật tất cả records hiện tại thành source = 'misa' (vì chúng đã được sync từ MISA)
    await queryRunner.query(`
      UPDATE "misaSaOrder" SET "source" = 'misa' WHERE "source" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_misaSaOrder_source"`);

    // Xóa cột
    await queryRunner.query(`
      ALTER TABLE "misaSaOrder"
      DROP COLUMN IF EXISTS "source"
    `);
  }
}
