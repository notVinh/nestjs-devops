import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMisaSaOrderWorkflowHistory1768600000000
  implements MigrationInterface
{
  name = 'CreateMisaSaOrderWorkflowHistory1768600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tạo bảng lưu lịch sử workflow
    await queryRunner.query(`
      CREATE TABLE "misaSaOrderWorkflowHistory" (
        "id" SERIAL PRIMARY KEY,
        "orderId" integer NOT NULL,
        "action" varchar(50) NOT NULL,
        "fromStatus" varchar(50),
        "toStatus" varchar(50),
        "performedByEmployeeId" integer NOT NULL,
        "performedByName" varchar(255),
        "performedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        "notes" text,
        "metadata" jsonb,
        "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
        "deletedAt" timestamp with time zone
      )
    `);

    // Tạo index
    await queryRunner.query(`
      CREATE INDEX "IDX_workflow_history_orderId" ON "misaSaOrderWorkflowHistory" ("orderId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_workflow_history_action" ON "misaSaOrderWorkflowHistory" ("action")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_workflow_history_performedByEmployeeId" ON "misaSaOrderWorkflowHistory" ("performedByEmployeeId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_workflow_history_performedAt" ON "misaSaOrderWorkflowHistory" ("performedAt")
    `);

    // Tạo foreign key
    await queryRunner.query(`
      ALTER TABLE "misaSaOrderWorkflowHistory"
      ADD CONSTRAINT "FK_workflow_history_orderId"
      FOREIGN KEY ("orderId") REFERENCES "misaSaOrder"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "misaSaOrderWorkflowHistory"
      ADD CONSTRAINT "FK_workflow_history_performedByEmployeeId"
      FOREIGN KEY ("performedByEmployeeId") REFERENCES "employee"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa foreign keys
    await queryRunner.query(`
      ALTER TABLE "misaSaOrderWorkflowHistory"
      DROP CONSTRAINT IF EXISTS "FK_workflow_history_orderId"
    `);
    await queryRunner.query(`
      ALTER TABLE "misaSaOrderWorkflowHistory"
      DROP CONSTRAINT IF EXISTS "FK_workflow_history_performedByEmployeeId"
    `);

    // Xóa bảng
    await queryRunner.query(`DROP TABLE IF EXISTS "misaSaOrderWorkflowHistory"`);
  }
}
