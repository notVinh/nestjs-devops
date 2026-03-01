import { MigrationInterface, QueryRunner } from "typeorm"

export class AddProvinceToMisaSaOrder1772000147847 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "misaSaOrder" ADD "province" character varying(100)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "misaSaOrder" DROP COLUMN "province"`);
    }

}
