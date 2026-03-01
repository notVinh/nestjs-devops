import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHolidayTable1761120000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "holiday" (
          "id" BIGSERIAL NOT NULL,
          "factoryId" BIGINT NOT NULL,
          "name" CHARACTER VARYING(255) NOT NULL,
          "date" DATE NOT NULL,
          "year" INTEGER NOT NULL,
          "isActive" BOOLEAN DEFAULT true,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
          "deletedAt" TIMESTAMP,
          CONSTRAINT "PK_holiday" PRIMARY KEY ("id")
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "holiday"`)
  }
}
