import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMisaSaOrderIdToPurchaseRequisition1768500000001
  implements MigrationInterface
{
  name = 'AddMisaSaOrderIdToPurchaseRequisition1768500000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Đổi misaOrderId thành nullable để backward compatible
    await queryRunner.query(`
      ALTER TABLE "purchaseRequisition"
      ALTER COLUMN "misaOrderId" DROP NOT NULL
    `);

    // Thêm column misaSaOrderId
    await queryRunner.query(`
      ALTER TABLE "purchaseRequisition"
      ADD COLUMN IF NOT EXISTS "misaSaOrderId" integer NULL
    `);

    // Thêm foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "purchaseRequisition"
      ADD CONSTRAINT "FK_purchaseRequisition_misaSaOrderId"
      FOREIGN KEY ("misaSaOrderId") REFERENCES "misaSaOrder"("id")
      ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "purchaseRequisition"
      DROP CONSTRAINT IF EXISTS "FK_purchaseRequisition_misaSaOrderId"
    `);

    // Xóa column
    await queryRunner.query(`
      ALTER TABLE "purchaseRequisition"
      DROP COLUMN IF EXISTS "misaSaOrderId"
    `);

    // Không khôi phục NOT NULL cho misaOrderId để tránh lỗi data
  }
}
