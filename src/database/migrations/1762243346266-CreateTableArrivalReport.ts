import { MigrationInterface, QueryRunner } from "typeorm"

export class CreateTableArrivalReport1762243346266 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "arrivalReport" (
                id BIGSERIAL NOT NULL,
                "factoryId" BIGINT NOT NULL,
                "employeeId" BIGINT NOT NULL,
                "checkEmployeeId" BIGINT NOT NULL,
                "arrivalDate" TIMESTAMP NOT NULL,
                "arrivalTime" TIMESTAMP,
                "arrivalLocation" POINT,
                "companyName" CHARACTER VARYING,
                "status" CHARACTER VARYING,
                "note" CHARACTER VARYING,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                CONSTRAINT "PK_arrivalReport" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE "arrivalReport";
        `);
    }

}
