import { MigrationInterface, QueryRunner } from "typeorm"

export class AddZaloAppCredentials1759885640045 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "zaloOa" ADD "appId" CHARACTER VARYING');
        await queryRunner.query('ALTER TABLE "zaloOa" ADD "appSecret" CHARACTER VARYING');
        await queryRunner.query('ALTER TABLE "zaloOa" ADD "apiUrl" CHARACTER VARYING');
        await queryRunner.query('ALTER TABLE "zaloOa" ADD "webhookUrl" CHARACTER VARYING');
        await queryRunner.query('ALTER TABLE "zaloOa" ADD "timeout" INTEGER');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "zaloOa" DROP COLUMN "appId"');
        await queryRunner.query('ALTER TABLE "zaloOa" DROP COLUMN "appSecret"');
        await queryRunner.query('ALTER TABLE "zaloOa" DROP COLUMN "apiUrl"');
        await queryRunner.query('ALTER TABLE "zaloOa" DROP COLUMN "webhookUrl"');
        await queryRunner.query('ALTER TABLE "zaloOa" DROP COLUMN "timeout"');
    }

}
