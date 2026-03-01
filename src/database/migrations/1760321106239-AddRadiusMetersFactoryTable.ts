import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRadiusMetersFactoryTable1760321106239
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "factory" ADD "radiusMeters" int NOT NULL DEFAULT 200`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "factory" DROP COLUMN "radiusMeters"`);
  }
}
