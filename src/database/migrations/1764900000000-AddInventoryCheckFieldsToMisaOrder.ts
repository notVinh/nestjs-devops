import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryCheckFieldsToMisaOrder1764300000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Thêm cột notes vào bảng misaOrder
    await queryRunner.query(`
      ALTER TABLE "misaOrder"
      ADD COLUMN "notes" TEXT;
    `);

    // Thêm cột inventoryCheckedByEmployeeId và inventoryCheckedAt vào bảng misaOrder
    await queryRunner.query(`
      ALTER TABLE "misaOrder"
      ADD COLUMN "inventoryCheckedByEmployeeId" INTEGER,
      ADD COLUMN "inventoryCheckedAt" TIMESTAMP;
    `);

    // Thêm foreign key constraint cho inventoryCheckedByEmployeeId
    await queryRunner.query(`
      ALTER TABLE "misaOrder"
      ADD CONSTRAINT "FK_misaOrder_inventoryCheckedBy" FOREIGN KEY ("inventoryCheckedByEmployeeId")
        REFERENCES "employee"("id") ON DELETE SET NULL;
    `);

    // Tạo index cho inventoryCheckedByEmployeeId
    await queryRunner.query(`
      CREATE INDEX "IDX_misaOrder_inventoryCheckedBy" ON "misaOrder"("inventoryCheckedByEmployeeId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_misaOrder_inventoryCheckedBy"`);

    // Xóa foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "misaOrder"
      DROP CONSTRAINT IF EXISTS "FK_misaOrder_inventoryCheckedBy";
    `);

    // Xóa các cột
    await queryRunner.query(`
      ALTER TABLE "misaOrder"
      DROP COLUMN "inventoryCheckedByEmployeeId",
      DROP COLUMN "inventoryCheckedAt",
      DROP COLUMN "notes";
    `);
  }
}
