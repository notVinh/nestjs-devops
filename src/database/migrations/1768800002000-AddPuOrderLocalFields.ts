import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPuOrderLocalFields1768800002000 implements MigrationInterface {
  name = 'AddPuOrderLocalFields1768800002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add local status field
    await queryRunner.query(`
      ALTER TABLE "misaPuOrder"
      ADD COLUMN IF NOT EXISTS "localStatus" VARCHAR(50) NOT NULL DEFAULT 'new'
    `);

    // Add expected arrival date
    await queryRunner.query(`
      ALTER TABLE "misaPuOrder"
      ADD COLUMN IF NOT EXISTS "expectedArrivalDate" DATE
    `);

    // Add purchase requisition reference
    await queryRunner.query(`
      ALTER TABLE "misaPuOrder"
      ADD COLUMN IF NOT EXISTS "purchaseRequisitionId" BIGINT
    `);

    // Add sales order reference (from purchase requisition)
    await queryRunner.query(`
      ALTER TABLE "misaPuOrder"
      ADD COLUMN IF NOT EXISTS "saOrderId" BIGINT
    `);

    // Add confirmed arrival date
    await queryRunner.query(`
      ALTER TABLE "misaPuOrder"
      ADD COLUMN IF NOT EXISTS "confirmedArrivalDate" TIMESTAMP WITH TIME ZONE
    `);

    // Add confirmed by info
    await queryRunner.query(`
      ALTER TABLE "misaPuOrder"
      ADD COLUMN IF NOT EXISTS "confirmedById" BIGINT
    `);

    await queryRunner.query(`
      ALTER TABLE "misaPuOrder"
      ADD COLUMN IF NOT EXISTS "confirmedByName" VARCHAR(255)
    `);

    // Add local notes
    await queryRunner.query(`
      ALTER TABLE "misaPuOrder"
      ADD COLUMN IF NOT EXISTS "localNotes" TEXT
    `);

    // Add updated by info
    await queryRunner.query(`
      ALTER TABLE "misaPuOrder"
      ADD COLUMN IF NOT EXISTS "updatedById" BIGINT
    `);

    await queryRunner.query(`
      ALTER TABLE "misaPuOrder"
      ADD COLUMN IF NOT EXISTS "updatedByName" VARCHAR(255)
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_misaPuOrder_localStatus" ON "misaPuOrder" ("localStatus")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_misaPuOrder_purchaseRequisitionId" ON "misaPuOrder" ("purchaseRequisitionId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_misaPuOrder_saOrderId" ON "misaPuOrder" ("saOrderId")`);

    // Add comment
    await queryRunner.query(`
      COMMENT ON COLUMN "misaPuOrder"."localStatus" IS 'Trạng thái nội bộ: new = Mới, waiting_goods = Chờ hàng về, goods_arrived = Hàng đã về'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_misaPuOrder_saOrderId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_misaPuOrder_purchaseRequisitionId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_misaPuOrder_localStatus"`);

    // Drop columns
    await queryRunner.query(`ALTER TABLE "misaPuOrder" DROP COLUMN IF EXISTS "updatedByName"`);
    await queryRunner.query(`ALTER TABLE "misaPuOrder" DROP COLUMN IF EXISTS "updatedById"`);
    await queryRunner.query(`ALTER TABLE "misaPuOrder" DROP COLUMN IF EXISTS "localNotes"`);
    await queryRunner.query(`ALTER TABLE "misaPuOrder" DROP COLUMN IF EXISTS "confirmedByName"`);
    await queryRunner.query(`ALTER TABLE "misaPuOrder" DROP COLUMN IF EXISTS "confirmedById"`);
    await queryRunner.query(`ALTER TABLE "misaPuOrder" DROP COLUMN IF EXISTS "confirmedArrivalDate"`);
    await queryRunner.query(`ALTER TABLE "misaPuOrder" DROP COLUMN IF EXISTS "saOrderId"`);
    await queryRunner.query(`ALTER TABLE "misaPuOrder" DROP COLUMN IF EXISTS "purchaseRequisitionId"`);
    await queryRunner.query(`ALTER TABLE "misaPuOrder" DROP COLUMN IF EXISTS "expectedArrivalDate"`);
    await queryRunner.query(`ALTER TABLE "misaPuOrder" DROP COLUMN IF EXISTS "localStatus"`);
  }
}
