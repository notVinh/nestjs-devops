import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmployeeAdminAccess1760550000000 implements MigrationInterface {
  name = 'EmployeeAdminAccess1760550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "employee" ADD "canAccessAdmin" boolean NOT NULL DEFAULT false`
    );
    // Use text[] to store menu keys; default empty array
    await queryRunner.query(
      `ALTER TABLE "employee" ADD "adminMenuKeys" text array DEFAULT '{}'`
    );
    await queryRunner.query(
      `UPDATE "employee" 
      SET "canAccessAdmin" = true, 
          "adminMenuKeys" = ARRAY['my-factory','my-factory-departments','my-factory-positions','my-factory-employees','attendance','message','my-factory-zalo-oa']::text[] 
      WHERE "deletedAt" IS NULL OR "deletedAt" IS NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "employee" DROP COLUMN "adminMenuKeys"`
    );
    await queryRunner.query(
      `ALTER TABLE "employee" DROP COLUMN "canAccessAdmin"`
    );
  }
}
