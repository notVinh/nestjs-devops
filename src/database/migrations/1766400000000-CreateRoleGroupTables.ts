import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRoleGroupTables1766400000000 implements MigrationInterface {
  name = 'CreateRoleGroupTables1766400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create roleGroup table
    await queryRunner.query(`
      CREATE TABLE "roleGroup" (
        "id" BIGSERIAL NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "name" character varying NOT NULL,
        "description" character varying,
        "factoryId" bigint NOT NULL,
        "canAccessAdmin" boolean NOT NULL DEFAULT false,
        "adminMenuKeys" TEXT[] DEFAULT '{}',
        "permissions" TEXT[] DEFAULT '{}',
        "status" character varying NOT NULL DEFAULT 'active',
        CONSTRAINT "PK_role_group_id" PRIMARY KEY ("id")
      )
    `);

    // Create employeeRoleGroup junction table
    await queryRunner.query(`
        CREATE TABLE "employeeRoleGroup" (
        "id" BIGSERIAL NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "employeeId" bigint NOT NULL,
        "roleGroupId" bigint NOT NULL,
        CONSTRAINT "PK_employee_role_group_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_employee_role_group_employee" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_employee_role_group_role_group" FOREIGN KEY ("roleGroupId") REFERENCES "roleGroup"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_employee_role_group" UNIQUE ("employeeId", "roleGroupId")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_roleGroup_factoryId" ON "roleGroup" ("factoryId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_roleGroup_status" ON "roleGroup" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_employeeRoleGroup_employee" ON "employeeRoleGroup" ("employeeId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_employeeRoleGroup_roleGroupId" ON "employeeRoleGroup" ("roleGroupId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_employeeRoleGroup_roleGroupId"`);
    await queryRunner.query(`DROP INDEX "IDX_employeeRoleGroup_employeeId"`);
    await queryRunner.query(`DROP INDEX "IDX_roleGroup_status"`);
    await queryRunner.query(`DROP INDEX "IDX_roleGroup_factoryId"`);
    await queryRunner.query(`DROP TABLE "employeeRoleGroup"`);
    await queryRunner.query(`DROP TABLE "roleGroup"`);
  }
}

