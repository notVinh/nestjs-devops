import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateApiTokenTable1767300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "misaToken" (
        "id" BIGSERIAL PRIMARY KEY,
        "accessToken" TEXT,
        "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
        "startedAt" TIMESTAMP,
        "completedAt" TIMESTAMP,
        "errorMessage" TEXT,
        "source" VARCHAR(20) NOT NULL DEFAULT 'manual',
        "logs" JSONB DEFAULT '[]',
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "deletedAt" TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_misa_token_started_at"
      ON "misaToken" ("startedAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_misa_token_started_at"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "misaToken"`);
  }
}
