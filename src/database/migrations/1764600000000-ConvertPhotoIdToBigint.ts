import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertPhotoIdToBigint1764600000000
  implements MigrationInterface
{
  name = 'ConvertPhotoIdToBigint1764600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check current photoId column type
    const result = await queryRunner.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'user'
      AND column_name = 'photoId'
    `);

    if (result.length > 0 && result[0].data_type === 'uuid') {
      // Drop foreign key constraint
      await queryRunner.query(
        `ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "FK_user_photoId"`
      );

      await queryRunner.query(
        `ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "FK_75e2be4ce11d447ef43be0e374f"`
      );

      // Drop and recreate photoId column as bigint
      await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "photoId"`);

      await queryRunner.query(
        `ALTER TABLE "user" ADD "photoId" bigint NULL`
      );

      // Add foreign key constraint back
      await queryRunner.query(
        `ALTER TABLE "user" ADD CONSTRAINT "FK_75e2be4ce11d447ef43be0e374f"
         FOREIGN KEY ("photoId") REFERENCES "file"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This migration is not reversible as data would be lost
    // If you need to rollback, restore from backup
  }
}
