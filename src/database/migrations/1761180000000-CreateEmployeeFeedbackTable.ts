import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmployeeFeedbackTable1761180000000
  implements MigrationInterface
{
  name = 'CreateEmployeeFeedbackTable1761180000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "employeeFeedback" (
        id BIGSERIAL NOT NULL,
        "factoryId" BIGINT NOT NULL,
        "employeeId" BIGINT NOT NULL,
        "title" CHARACTER VARYING(255) NOT NULL,
        "content" TEXT NOT NULL,
        "priority" CHARACTER VARYING(20) NOT NULL DEFAULT 'medium' CHECK ("priority" IN ('low','medium','high','urgent')),
        "status" CHARACTER VARYING(20) NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending','replied')),
        "attachments" TEXT,
        "repliedByEmployeeId" BIGINT,
        "replyContent" TEXT,
        "repliedAt" TIMESTAMP,
        "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
        "viewedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_employee_feedback" PRIMARY KEY (id)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_employee_feedback_factory" ON "employeeFeedback" ("factoryId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_employee_feedback_employee" ON "employeeFeedback" ("employeeId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_employee_feedback_status" ON "employeeFeedback" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_employee_feedback_created" ON "employeeFeedback" ("createdAt" DESC)`,
    );

    // Add foreign keys
    await queryRunner.query(`
      ALTER TABLE "employeeFeedback"
      ADD CONSTRAINT "FK_employee_feedback_employee"
      FOREIGN KEY ("employeeId")
      REFERENCES "employee"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "employeeFeedback"
      ADD CONSTRAINT "FK_employee_feedback_repliedBy"
      FOREIGN KEY ("repliedByEmployeeId")
      REFERENCES "employee"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "employeeFeedback"
      ADD CONSTRAINT "FK_employee_feedback_factory"
      FOREIGN KEY ("factoryId")
      REFERENCES "factory"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "employeeFeedback" DROP CONSTRAINT "FK_employee_feedback_factory"`,
    );
    await queryRunner.query(
      `ALTER TABLE "employeeFeedback" DROP CONSTRAINT "FK_employee_feedback_repliedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "employeeFeedback" DROP CONSTRAINT "FK_employee_feedback_employee"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_employee_feedback_created"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_employee_feedback_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_employee_feedback_employee"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_employee_feedback_factory"`,
    );
    await queryRunner.query(`DROP TABLE "employeeFeedback"`);
  }
}
