import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLocalFieldsToMisaSaOrder1768200000000 implements MigrationInterface {
  name = 'AddLocalFieldsToMisaSaOrder1768200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Các trường LOCAL - Sale Admin/Kế toán nhập, KHÔNG sync từ MISA
    await queryRunner.query(`
      ALTER TABLE "misaSaOrder"
      ADD COLUMN IF NOT EXISTS "requestedDeliveryDate" DATE,
      ADD COLUMN IF NOT EXISTS "actualExportDate" DATE,
      ADD COLUMN IF NOT EXISTS "goodsStatus" TEXT,
      ADD COLUMN IF NOT EXISTS "machineType" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "region" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "priority" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "localDeliveryStatus" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "saleType" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "receiverName" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "receiverPhone" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "specificAddress" TEXT
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "misaSaOrder"
      DROP COLUMN IF EXISTS "requestedDeliveryDate",
      DROP COLUMN IF EXISTS "actualExportDate",
      DROP COLUMN IF EXISTS "goodsStatus",
      DROP COLUMN IF EXISTS "machineType",
      DROP COLUMN IF EXISTS "region",
      DROP COLUMN IF EXISTS "priority",
      DROP COLUMN IF EXISTS "localDeliveryStatus",
      DROP COLUMN IF EXISTS "saleType",
      DROP COLUMN IF EXISTS "receiverName",
      DROP COLUMN IF EXISTS "receiverPhone",
      DROP COLUMN IF EXISTS "specificAddress"
    `);
  }
}
