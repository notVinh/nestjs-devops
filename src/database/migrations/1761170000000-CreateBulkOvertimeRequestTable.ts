import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBulkOvertimeRequestTable1761170000000 implements MigrationInterface {
  name = 'CreateBulkOvertimeRequestTable1761170000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create bulkOvertimeRequest table
    await queryRunner.query(
      `CREATE TABLE "bulkOvertimeRequest" (
          "id" BIGSERIAL NOT NULL,
          "factoryId" INT NOT NULL,
          "creatorEmployeeId" INT NOT NULL,
          "approverEmployeeId" INT NOT NULL,
          "title" VARCHAR(500) NOT NULL,
          "overtimeDate" DATE NOT NULL,
          "startTime" VARCHAR(5) NOT NULL,
          "endTime" VARCHAR(5) NOT NULL,
          "totalHours" DECIMAL(4,2),
          "overtimeCoefficientId" BIGINT NOT NULL,
          "coefficientName" VARCHAR(255),
          "overtimeRate" DECIMAL(3,2) DEFAULT 1.5,
          "reason" VARCHAR,
          "status" VARCHAR(20) DEFAULT 'draft',
          "confirmedAt" TIMESTAMP,
          "confirmedByEmployeeId" INT,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "deletedAt" TIMESTAMP,
          CONSTRAINT "PK_bulkOvertimeRequest" PRIMARY KEY ("id")
        )`
    );

    // Create bulkOvertimeRequestEmployee junction table
    await queryRunner.query(
      `CREATE TABLE "bulkOvertimeRequestEmployee" (
          "id" BIGSERIAL NOT NULL,
          "bulkOvertimeRequestId" BIGINT NOT NULL,
          "employeeId" INT NOT NULL,
          "overtimeId" BIGINT,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "deletedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "PK_bulkOvertimeRequestEmployee" PRIMARY KEY ("id")
        )`
    );

    // Add indexes for better query performance
    await queryRunner.query(
      `CREATE INDEX "IDX_bulkOvertimeRequest_factory" ON "bulkOvertimeRequest" ("factoryId")`
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_bulkOvertimeRequest_creator" ON "bulkOvertimeRequest" ("creatorEmployeeId")`
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_bulkOvertimeRequest_status" ON "bulkOvertimeRequest" ("status")`
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_bulkOvertimeRequest_employee_bulk" ON "bulkOvertimeRequestEmployee" ("bulkOvertimeRequestId")`
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_bulkOvertimeRequest_employee_emp" ON "bulkOvertimeRequestEmployee" ("employeeId")`
    );  
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_bulkOvertimeRequest_employee_emp"`);
    await queryRunner.query(`DROP INDEX "IDX_bulkOvertimeRequest_employee_bulk"`);
    await queryRunner.query(`DROP INDEX "IDX_bulkOvertimeRequest_status"`);
    await queryRunner.query(`DROP INDEX "IDX_bulkOvertimeRequest_creator"`);
    await queryRunner.query(`DROP INDEX "IDX_bulkOvertimeRequest_factory"`);
    await queryRunner.dropTable('bulkOvertimeRequestEmployee');
    await queryRunner.dropTable('bulkOvertimeRequest');
  }
}
