import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDepartmentPositionRelations1759905000000
  implements MigrationInterface
{
  name = 'AddDepartmentPositionRelations1759905000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "positionEmployee" ADD "departmentId" bigint`
    );
    await queryRunner.query(
        `ALTER TABLE "employee" ADD "departmentId" bigint`
    );
    await queryRunner.query(
      `ALTER TABLE "positionEmployee" ADD "status" character varying NOT NULL DEFAULT 'active'`
    );
    await queryRunner.query(
      `ALTER TABLE "department" ADD "description" character varying`
    );
    await queryRunner.query(
      `ALTER TABLE "department" ADD "status" character varying NOT NULL DEFAULT 'active'`
    );

    await queryRunner.query(
      `ALTER TABLE "positionEmployee" ADD CONSTRAINT "FK_position_department" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "employee" ADD CONSTRAINT "FK_employee_department" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "employee" DROP CONSTRAINT "FK_employee_department"`
    );
    await queryRunner.query(
      `ALTER TABLE "positionEmployee" DROP CONSTRAINT "FK_position_department"`
    );

    await queryRunner.query(
        `ALTER TABLE "department" DROP COLUMN "status"`
    );
    await queryRunner.query(
      `ALTER TABLE "department" DROP COLUMN "description"`
    );
    await queryRunner.query(
      `ALTER TABLE "positionEmployee" DROP COLUMN "status"`
    );
    await queryRunner.query(
      `ALTER TABLE "employee" DROP COLUMN "departmentId"`
    );
    await queryRunner.query(
      `ALTER TABLE "positionEmployee" DROP COLUMN "departmentId"`
    );
  }
}
