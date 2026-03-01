import { MigrationInterface, QueryRunner } from "typeorm"

export class CreateTableMaintenanceReport1762328302816 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "maintenanceReport" (
                id BIGSERIAL NOT NULL,
                "factoryId" BIGINT NOT NULL,
                "employeeId" BIGINT NOT NULL,
                "assignedEmployeeId" BIGINT,
                "reportDate" TIMESTAMP NOT NULL,
                "machineCode" CHARACTER VARYING,
                "machineName" CHARACTER VARYING NOT NULL,
                "issueDescription" TEXT NOT NULL,
                "priority" CHARACTER VARYING DEFAULT 'medium',
                "status" CHARACTER VARYING DEFAULT 'pending',
                "note" TEXT,
                "resolvedAt" TIMESTAMP,
                "resolvedNote" TEXT,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                CONSTRAINT "PK_maintenanceReport" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE "maintenanceReport";
        `);
    }

}
