import { MigrationInterface, QueryRunner } from "typeorm"

export class AddRequestLocationOvertimeTable1762156846826 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "overtime" ADD COLUMN "requestLocation" point;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "overtime" DROP COLUMN "requestLocation";
        `);
    }
}
