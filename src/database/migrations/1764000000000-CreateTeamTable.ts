import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTeamTable1764000000000 implements MigrationInterface {
  name = 'CreateTeamTable1764000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "team" (
        "id" BIGSERIAL NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "name" character varying NOT NULL,
        "departmentId" bigint NOT NULL,
        "factoryId" bigint NOT NULL,
        "description" character varying,
        "status" character varying NOT NULL DEFAULT 'active',
        CONSTRAINT "PK_team_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_team_factoryId" ON "team" ("factoryId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_team_status" ON "team" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_team_status"`);
    await queryRunner.query(`DROP INDEX "IDX_team_factoryId"`);
    await queryRunner.query(`DROP TABLE "team"`);
  }
}
