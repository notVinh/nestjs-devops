import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNameToFileTable1764500000000 implements MigrationInterface {
  name = 'AddNameToFileTable1764500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if name column already exists
    const table = await queryRunner.getTable('file');
    const hasNameColumn = table?.findColumnByName('name');

    if (!hasNameColumn) {
      await queryRunner.query(
        `ALTER TABLE "file" ADD "name" VARCHAR NOT NULL DEFAULT ''`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "file" DROP COLUMN IF EXISTS "name"`);
  }
}
