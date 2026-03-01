import { MigrationInterface, QueryRunner } from "typeorm"

export class AddZaloUserIdToEmployee1759718303790 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "user" ADD "zaloUserId" BIGINT');
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "id" TYPE BIGINT`);
        await queryRunner.query(`ALTER TABLE "attendance" ALTER COLUMN "id" TYPE BIGINT`);
        await queryRunner.query(`ALTER TABLE "employee" ALTER COLUMN "id" TYPE BIGINT`);
        await queryRunner.query(`ALTER TABLE "factory" ALTER COLUMN "id" TYPE BIGINT`);
        await queryRunner.query(`ALTER TABLE "zaloOa" ALTER COLUMN "id" TYPE BIGINT`);
        await queryRunner.query(`ALTER TABLE "zaloMessages" ALTER COLUMN "id" TYPE BIGINT`);
        await queryRunner.query(`ALTER TABLE "zaloMessageRecipients" ALTER COLUMN "id" TYPE BIGINT`);
        await queryRunner.query(`ALTER TABLE "zaloMessageTemplates" ALTER COLUMN "id" TYPE BIGINT`);
        await queryRunner.query(`ALTER TABLE "session" ALTER COLUMN "id" TYPE BIGINT`);
        await queryRunner.query(`ALTER TABLE "role" ALTER COLUMN "id" TYPE BIGINT`);
        await queryRunner.query(`ALTER TABLE "status" ALTER COLUMN "id" TYPE BIGINT`);
        await queryRunner.query(`ALTER TABLE "forgot" ALTER COLUMN "id" TYPE BIGINT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "user" DROP COLUMN "zaloUserId"');
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "id" TYPE INTEGER`);
        await queryRunner.query(`ALTER TABLE "attendance" ALTER COLUMN "id" TYPE INTEGER`);
        await queryRunner.query(`ALTER TABLE "employee" ALTER COLUMN "id" TYPE INTEGER`);
        await queryRunner.query(`ALTER TABLE "factory" ALTER COLUMN "id" TYPE INTEGER`);
        await queryRunner.query(`ALTER TABLE "zaloOa" ALTER COLUMN "id" TYPE INTEGER`);
        await queryRunner.query(`ALTER TABLE "zaloMessages" ALTER COLUMN "id" TYPE INTEGER`);
        await queryRunner.query(`ALTER TABLE "zaloMessageRecipients" ALTER COLUMN "id" TYPE INTEGER`);
        await queryRunner.query(`ALTER TABLE "zaloMessageTemplates" ALTER COLUMN "id" TYPE INTEGER`);
        await queryRunner.query(`ALTER TABLE "session" ALTER COLUMN "id" TYPE INTEGER`);
        await queryRunner.query(`ALTER TABLE "role" ALTER COLUMN "id" TYPE INTEGER`);
        await queryRunner.query(`ALTER TABLE "status" ALTER COLUMN "id" TYPE INTEGER`);
        await queryRunner.query(`ALTER TABLE "forgot" ALTER COLUMN "id" TYPE INTEGER`);
    }

}
