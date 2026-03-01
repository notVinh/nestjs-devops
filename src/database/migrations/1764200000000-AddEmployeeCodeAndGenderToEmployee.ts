import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmployeeCodeAndGenderToEmployee1764200000000
  implements MigrationInterface
{
  name = 'AddEmployeeCodeAndGenderToEmployee1764200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "employee" ADD "employeeCode" character varying`
    );
    await queryRunner.query(
      `ALTER TABLE "employee" ADD "gender" character varying`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "employee" DROP COLUMN "gender"`);
    await queryRunner.query(
      `ALTER TABLE "employee" DROP COLUMN "employeeCode"`
    );
  }
}
