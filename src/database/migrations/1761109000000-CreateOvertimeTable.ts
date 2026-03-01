import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateOvertimeTable1761109000000 implements MigrationInterface {
  name = 'CreateOvertimeTable1761109000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "overtime" (
          "id" BIGSERIAL NOT NULL,
          "factoryId" INT NOT NULL,
          "employeeId" INT NOT NULL,
          "approverEmployeeId" INT NOT NULL,
          "overtimeDate" DATE NOT NULL,
          "startTime" VARCHAR(5) NOT NULL,
          "endTime" VARCHAR(5) NOT NULL,
          "totalHours" DECIMAL(4,2),
          "overtimeRate" DECIMAL(3,2) DEFAULT 1.5,
          "reason" VARCHAR,
          "status" VARCHAR(20) DEFAULT 'pending',
          "decisionNote" VARCHAR,
          "decidedAt" TIMESTAMP,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "deletedAt" TIMESTAMP,
          CONSTRAINT "PK_overtime" PRIMARY KEY ("id")
        )`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('overtime');
  }
}
