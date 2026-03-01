import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLeaveTypeTable1765600000000 implements MigrationInterface {
  name = 'CreateLeaveTypeTable1765600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tạo bảng leaveType
    await queryRunner.query(
      `CREATE TABLE "leaveType" (
          "id" BIGSERIAL NOT NULL,
          "factoryId" INT NOT NULL,
          "code" VARCHAR(50) NOT NULL,
          "name" VARCHAR(255) NOT NULL,
          "isPaid" BOOLEAN DEFAULT true,
          "deductsFromAnnualLeave" BOOLEAN DEFAULT true,
          "description" TEXT,
          "isActive" BOOLEAN DEFAULT true,
          "sortOrder" INT DEFAULT 0,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "deletedAt" TIMESTAMP,
          CONSTRAINT "PK_leaveType" PRIMARY KEY ("id")
        )`,
    );

    // Tạo index cho các trường thường xuyên query
    await queryRunner.query(
      `CREATE INDEX "IDX_leaveTypeFactory" ON "leaveType" ("factoryId")`,
    );

    // Tạo unique constraint cho code trong cùng factory
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_leaveTypeFactoryCode" ON "leaveType" ("factoryId", "code") WHERE "deletedAt" IS NULL`,
    );

    // Thêm cột leaveTypeId vào bảng leaveRequest
    await queryRunner.query(
      `ALTER TABLE "leaveRequest" ADD COLUMN "leaveTypeId" BIGINT`,
    );

    // Tạo index cho leaveTypeId
    await queryRunner.query(
      `CREATE INDEX "IDX_leaveRequestLeaveType" ON "leaveRequest" ("leaveTypeId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa index và cột leaveTypeId từ bảng leaveRequest
    await queryRunner.query(`DROP INDEX "IDX_leaveRequestLeaveType"`);
    await queryRunner.query(
      `ALTER TABLE "leaveRequest" DROP COLUMN "leaveTypeId"`,
    );

    // Xóa bảng leaveType
    await queryRunner.query(`DROP INDEX "IDX_leaveTypeFactoryCode"`);
    await queryRunner.query(`DROP INDEX "IDX_leaveTypeFactory"`);
    await queryRunner.query(`DROP TABLE "leaveType"`);
  }
}
