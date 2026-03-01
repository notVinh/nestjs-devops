import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWorkDaysToFactory1760069037454 implements MigrationInterface {
    name = 'AddWorkDaysToFactory1760069037454'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "factory" 
            ADD COLUMN "workDays" json
        `);
        
        // Set default work days (Mon-Fri) for existing factories
        await queryRunner.query(`
            UPDATE "factory" 
            SET "workDays" = '[1,2,3,4,5]'::json 
            WHERE "workDays" IS NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "factory" 
            DROP COLUMN "workDays"
        `);
    }
}