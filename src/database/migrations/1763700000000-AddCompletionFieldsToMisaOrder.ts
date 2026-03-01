import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompletionFieldsToMisaOrder1763700000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Thêm cột completedByEmployeeId và completedAt vào bảng misaOrder
    await queryRunner.query(`
      ALTER TABLE "misaOrder"
      ADD COLUMN "completedByEmployeeId" INTEGER,
      ADD COLUMN "completedAt" TIMESTAMP;
    `);

    // Thêm foreign key constraint cho completedByEmployeeId
    await queryRunner.query(`
      ALTER TABLE "misaOrder"
      ADD CONSTRAINT "FK_misaOrder_completedBy" FOREIGN KEY ("completedByEmployeeId")
        REFERENCES "employee"("id") ON DELETE SET NULL;
    `);

    // Tạo index cho completedByEmployeeId
    await queryRunner.query(`
      CREATE INDEX "IDX_misaOrder_completedBy" ON "misaOrder"("completedByEmployeeId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_misaOrder_completedBy"`);

    // Xóa foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "misaOrder"
      DROP CONSTRAINT IF EXISTS "FK_misaOrder_completedBy";
    `);

    // Xóa các cột
    await queryRunner.query(`
      ALTER TABLE "misaOrder"
      DROP COLUMN "completedByEmployeeId",
      DROP COLUMN "completedAt";
    `);
  }
}
