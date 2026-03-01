import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRevisionToOrderAssignment1763600000000 implements MigrationInterface {
    name = 'AddRevisionToOrderAssignment1763600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add revision column to orderAssignment table
        await queryRunner.query(`
            ALTER TABLE "orderAssignment"
            ADD COLUMN "revision" integer NOT NULL DEFAULT 1
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove revision column
        await queryRunner.query(`
            ALTER TABLE "orderAssignment"
            DROP COLUMN "revision"
        `);
    }
}
