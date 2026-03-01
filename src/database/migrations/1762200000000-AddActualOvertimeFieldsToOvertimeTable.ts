import { MigrationInterface, QueryRunner } from "typeorm"

export class AddActualOvertimeFieldsToOvertimeTable1762200000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "overtime"
            ADD COLUMN "excessHours" decimal(4,2) NULL,
            ADD COLUMN "actualStatus" varchar(20) NULL;
        `);

        await queryRunner.query(`
            ALTER TABLE "attendance"
            ADD COLUMN "overtimeNote" text NULL;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "overtime"
            DROP COLUMN "excessHours",
            DROP COLUMN "actualStatus";
        `);
        await queryRunner.query(`
            ALTER TABLE "attendance"
            DROP COLUMN "overtimeNote";
        `);
    }
}
