import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeamIdToEmployee1764100000000 implements MigrationInterface {
  name = 'AddTeamIdToEmployee1764100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add teamId column to employee table (nullable for existing records)
    await queryRunner.query(`
      ALTER TABLE "employee"
      ADD COLUMN "teamId" bigint
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "employee"
      ADD CONSTRAINT "FK_employee_team"
      FOREIGN KEY ("teamId")
      REFERENCES "team"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);

    // Add index for better query performance
    await queryRunner.query(`
      CREATE INDEX "IDX_employee_teamId" ON "employee" ("teamId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_employee_teamId"`);
    await queryRunner.query(`ALTER TABLE "employee" DROP CONSTRAINT "FK_employee_team"`);
    await queryRunner.query(`ALTER TABLE "employee" DROP COLUMN "teamId"`);
  }
}
