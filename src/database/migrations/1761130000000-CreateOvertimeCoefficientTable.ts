import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOvertimeCoefficientTable1761130000000
  implements MigrationInterface
{
  name = 'CreateOvertimeCoefficientTable1761130000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "overtimeCoefficient" (
          "id" BIGSERIAL NOT NULL,
          "factoryId" INT NOT NULL,
          "shiftName" VARCHAR(255) NOT NULL,
          "coefficient" DECIMAL(5,2) NOT NULL,
          "shiftType" VARCHAR(20) NOT NULL,
          "dayType" VARCHAR(20) NOT NULL,
          "hasWorkedDayShift" BOOLEAN DEFAULT false,
          "description" TEXT,
          "isActive" BOOLEAN DEFAULT true,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "deletedAt" TIMESTAMP,
          CONSTRAINT "PK_overtimeCoefficient" PRIMARY KEY ("id")
        )`,
    );

    // Tạo index cho các trường thường xuyên query
    await queryRunner.query(
      `CREATE INDEX "IDX_overtimeCoefficientFactory" ON "overtimeCoefficient" ("factoryId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_overtimeCoefficientShiftDayType" ON "overtimeCoefficient" ("shiftType", "dayType")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_overtimeCoefficientShiftDayType"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_overtimeCoefficientFactory"`);
    await queryRunner.query(`DROP TABLE "overtimeCoefficient"`);
  }
}
