import { MigrationInterface, QueryRunner } from "typeorm"

export class AddColumnEmployeeTable1759982151418 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "employee" ADD "isManager" BOOLEAN NOT NULL DEFAULT FALSE');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "employee" DROP COLUMN "isManager"');
    }

}
