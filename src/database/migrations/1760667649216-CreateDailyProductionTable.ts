import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDailyProductionTable1760667649216
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE "dailyProduction" (
            "id" BIGSERIAL NOT NULL,
            "factoryId" BIGINT NOT NULL,
            "employeeId" BIGINT NOT NULL,
            "date" TIMESTAMP NOT NULL,
            "productName" CHARACTER VARYING NOT NULL,
            "quantity" BIGINT NOT NULL,
            "unitPrice" DECIMAL(10,2),
            "price" DECIMAL(10,2),
            "totalPrice" DECIMAL(10,2),
            "note" CHARACTER VARYING,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            "deletedAt" TIMESTAMP,
            CONSTRAINT "PK_dailyProduction" PRIMARY KEY ("id")
        )
    `);
    await queryRunner.query(`
        ALTER TABLE "employee" ADD "salaryType" CHARACTER VARYING NOT NULL DEFAULT 'daily' CHECK ("salaryType" IN ('daily', 'production'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TABLE "dailyProduction"
    `);
    await queryRunner.query(`
        ALTER TABLE "employee" DROP COLUMN "salaryType"
    `);
  }
}
