import { MigrationInterface, QueryRunner } from "typeorm"

export class CreateDepartmentTable1759899032154 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "department" (
            "id" BIGSERIAL NOT NULL,
            "name" VARCHAR(255) NOT NULL,
            "factoryId" BIGINT NOT NULL,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            "deletedAt" TIMESTAMP,
            CONSTRAINT "PK_b575144cf9337a708d560e5f35f" PRIMARY KEY ("id")
        )`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "department"`);
    }

}
