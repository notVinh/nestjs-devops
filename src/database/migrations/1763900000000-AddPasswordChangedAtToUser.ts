import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordChangedAtToUser1763900000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "passwordChangedAt" TIMESTAMP NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "passwordChangedAt"`);
  }
}
