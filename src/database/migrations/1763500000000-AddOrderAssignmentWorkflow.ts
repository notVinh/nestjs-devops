import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderAssignmentWorkflow1763500000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Thêm cột currentStep vào bảng misaOrder
    await queryRunner.query(`
      ALTER TABLE "misaOrder"
      ADD COLUMN "currentStep" VARCHAR(50);
    `);

    // Tạo bảng orderAssignment để lưu lịch sử giao việc
    await queryRunner.query(`
      CREATE TABLE "orderAssignment" (
        "id" SERIAL PRIMARY KEY,
        "orderId" INTEGER NOT NULL,
        "employeeId" INTEGER NOT NULL,
        "step" VARCHAR(50) NOT NULL,
        "assignedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "assignedByEmployeeId" INTEGER,
        "notes" TEXT,

        -- Thông tin công ty vận chuyển (chỉ cho step = shipping_company)
        "shippingCompanyName" VARCHAR(255),
        "shippingCompanyPhone" VARCHAR(20),
        "shippingCompanyAddress" TEXT,
        "trackingNumber" VARCHAR(100),

        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,

        CONSTRAINT "FK_orderAssignment_order" FOREIGN KEY ("orderId")
          REFERENCES "misaOrder"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_orderAssignment_employee" FOREIGN KEY ("employeeId")
          REFERENCES "employee"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_orderAssignment_assignedBy" FOREIGN KEY ("assignedByEmployeeId")
          REFERENCES "employee"("id") ON DELETE SET NULL
      )
    `);

    // Tạo index
    await queryRunner.query(`
      CREATE INDEX "IDX_orderAssignment_order" ON "orderAssignment"("orderId");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_orderAssignment_employee" ON "orderAssignment"("employeeId");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_orderAssignment_step" ON "orderAssignment"("step");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orderAssignment_step"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orderAssignment_employee"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orderAssignment_order"`);

    // Xóa bảng
    await queryRunner.query(`DROP TABLE IF EXISTS "orderAssignment"`);

    // Xóa cột currentStep
    await queryRunner.query(`
      ALTER TABLE "misaOrder"
      DROP COLUMN "currentStep";
    `);
  }
}
