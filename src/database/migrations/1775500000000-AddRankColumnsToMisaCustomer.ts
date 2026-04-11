import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRankColumnsToMisaCustomer1775500000000 implements MigrationInterface {
  name = 'AddRankColumnsToMisaCustomer1775500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rank khách hàng: A / B / C / D dựa trên doanh thu trung bình/tháng
    await queryRunner.query(`
      ALTER TABLE "misaCustomer"
      ADD COLUMN IF NOT EXISTS "rank" VARCHAR(1) DEFAULT 'D'
    `);

    // Doanh thu tháng hiện tại (tổng totalAmountOc trong tháng này, đơn vị: VND)
    await queryRunner.query(`
      ALTER TABLE "misaCustomer"
      ADD COLUMN IF NOT EXISTS "currentMonthRevenue" DECIMAL(18, 2) NOT NULL DEFAULT 0
    `);

    // Doanh thu trung bình/tháng (đơn vị: triệu VND, làm tròn 2 chữ số thập phân)
    await queryRunner.query(`
      ALTER TABLE "misaCustomer"
      ADD COLUMN IF NOT EXISTS "avgMonthlyRevenue" DECIMAL(18, 2) NOT NULL DEFAULT 0
    `);

    // Thêm index để lọc nhanh theo rank
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_misaCustomer_rank" ON "misaCustomer" ("rank")
    `);

    // Timestamp cập nhật rank lần cuối
    await queryRunner.query(`
      ALTER TABLE "misaCustomer"
      ADD COLUMN IF NOT EXISTS "rankUpdatedAt" TIMESTAMP WITH TIME ZONE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_misaCustomer_rank"`);
    await queryRunner.query(`ALTER TABLE "misaCustomer" DROP COLUMN IF EXISTS "rankUpdatedAt"`);
    await queryRunner.query(`ALTER TABLE "misaCustomer" DROP COLUMN IF EXISTS "avgMonthlyRevenue"`);
    await queryRunner.query(`ALTER TABLE "misaCustomer" DROP COLUMN IF EXISTS "currentMonthRevenue"`);
    await queryRunner.query(`ALTER TABLE "misaCustomer" DROP COLUMN IF EXISTS "rank"`);
  }
}
