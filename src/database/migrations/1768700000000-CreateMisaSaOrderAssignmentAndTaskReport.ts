import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMisaSaOrderAssignmentAndTaskReport1768700000000
  implements MigrationInterface
{
  name = 'CreateMisaSaOrderAssignmentAndTaskReport1768700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tạo bảng misaSaOrderAssignment
    await queryRunner.query(`
      CREATE TABLE "misaSaOrderAssignment" (
        "id" SERIAL NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,

        "orderId" integer NOT NULL,
        "taskType" character varying(50) NOT NULL,

        "assignedToId" integer NOT NULL,
        "assignedToName" character varying(255),

        "assignedById" integer NOT NULL,
        "assignedByName" character varying(255),
        "assignedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

        "scheduledAt" TIMESTAMP WITH TIME ZONE,
        "startedAt" TIMESTAMP WITH TIME ZONE,
        "completedAt" TIMESTAMP WITH TIME ZONE,

        "status" character varying(30) NOT NULL DEFAULT 'pending',

        "completionNotes" text,
        "incompleteReason" text,
        "attachments" jsonb,

        "reassignedFromId" integer,
        "reassignReason" text,

        "notes" text,

        CONSTRAINT "PK_misaSaOrderAssignment" PRIMARY KEY ("id")
      )
    `);

    // Indexes cho misaSaOrderAssignment
    await queryRunner.query(`
      CREATE INDEX "IDX_misaSaOrderAssignment_orderId" ON "misaSaOrderAssignment" ("orderId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_misaSaOrderAssignment_taskType" ON "misaSaOrderAssignment" ("taskType")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_misaSaOrderAssignment_assignedToId" ON "misaSaOrderAssignment" ("assignedToId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_misaSaOrderAssignment_status" ON "misaSaOrderAssignment" ("status")
    `);

    // Foreign keys cho misaSaOrderAssignment
    await queryRunner.query(`
      ALTER TABLE "misaSaOrderAssignment"
      ADD CONSTRAINT "FK_misaSaOrderAssignment_orderId"
      FOREIGN KEY ("orderId") REFERENCES "misaSaOrder"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "misaSaOrderAssignment"
      ADD CONSTRAINT "FK_misaSaOrderAssignment_assignedToId"
      FOREIGN KEY ("assignedToId") REFERENCES "employee"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "misaSaOrderAssignment"
      ADD CONSTRAINT "FK_misaSaOrderAssignment_assignedById"
      FOREIGN KEY ("assignedById") REFERENCES "employee"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "misaSaOrderAssignment"
      ADD CONSTRAINT "FK_misaSaOrderAssignment_reassignedFromId"
      FOREIGN KEY ("reassignedFromId") REFERENCES "misaSaOrderAssignment"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Tạo bảng misaSaOrderTaskReport
    await queryRunner.query(`
      CREATE TABLE "misaSaOrderTaskReport" (
        "id" SERIAL NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,

        "assignmentId" integer NOT NULL,
        "orderId" integer NOT NULL,

        "reportedById" integer NOT NULL,
        "reportedByName" character varying(255),
        "reportedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "reportDate" date NOT NULL,

        "reportType" character varying(30) NOT NULL,
        "status" character varying(30) NOT NULL,
        "progressPercent" integer,
        "description" text NOT NULL,

        "attachments" jsonb,
        "blockedReason" text,

        CONSTRAINT "PK_misaSaOrderTaskReport" PRIMARY KEY ("id")
      )
    `);

    // Indexes cho misaSaOrderTaskReport
    await queryRunner.query(`
      CREATE INDEX "IDX_misaSaOrderTaskReport_assignmentId" ON "misaSaOrderTaskReport" ("assignmentId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_misaSaOrderTaskReport_orderId" ON "misaSaOrderTaskReport" ("orderId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_misaSaOrderTaskReport_reportedById" ON "misaSaOrderTaskReport" ("reportedById")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_misaSaOrderTaskReport_reportDate" ON "misaSaOrderTaskReport" ("reportDate")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_misaSaOrderTaskReport_reportType" ON "misaSaOrderTaskReport" ("reportType")
    `);

    // Foreign keys cho misaSaOrderTaskReport
    await queryRunner.query(`
      ALTER TABLE "misaSaOrderTaskReport"
      ADD CONSTRAINT "FK_misaSaOrderTaskReport_assignmentId"
      FOREIGN KEY ("assignmentId") REFERENCES "misaSaOrderAssignment"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "misaSaOrderTaskReport"
      ADD CONSTRAINT "FK_misaSaOrderTaskReport_orderId"
      FOREIGN KEY ("orderId") REFERENCES "misaSaOrder"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "misaSaOrderTaskReport"
      ADD CONSTRAINT "FK_misaSaOrderTaskReport_reportedById"
      FOREIGN KEY ("reportedById") REFERENCES "employee"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // Unique constraint: mỗi assignment chỉ có 1 báo cáo hàng ngày cho mỗi ngày
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_misaSaOrderTaskReport_assignment_date_daily"
      ON "misaSaOrderTaskReport" ("assignmentId", "reportDate")
      WHERE "reportType" = 'daily_progress' AND "deletedAt" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop misaSaOrderTaskReport
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_misaSaOrderTaskReport_assignment_date_daily"`);
    await queryRunner.query(`ALTER TABLE "misaSaOrderTaskReport" DROP CONSTRAINT IF EXISTS "FK_misaSaOrderTaskReport_reportedById"`);
    await queryRunner.query(`ALTER TABLE "misaSaOrderTaskReport" DROP CONSTRAINT IF EXISTS "FK_misaSaOrderTaskReport_orderId"`);
    await queryRunner.query(`ALTER TABLE "misaSaOrderTaskReport" DROP CONSTRAINT IF EXISTS "FK_misaSaOrderTaskReport_assignmentId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_misaSaOrderTaskReport_reportType"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_misaSaOrderTaskReport_reportDate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_misaSaOrderTaskReport_reportedById"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_misaSaOrderTaskReport_orderId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_misaSaOrderTaskReport_assignmentId"`);
    await queryRunner.query(`DROP TABLE "misaSaOrderTaskReport"`);

    // Drop misaSaOrderAssignment
    await queryRunner.query(`ALTER TABLE "misaSaOrderAssignment" DROP CONSTRAINT IF EXISTS "FK_misaSaOrderAssignment_reassignedFromId"`);
    await queryRunner.query(`ALTER TABLE "misaSaOrderAssignment" DROP CONSTRAINT IF EXISTS "FK_misaSaOrderAssignment_assignedById"`);
    await queryRunner.query(`ALTER TABLE "misaSaOrderAssignment" DROP CONSTRAINT IF EXISTS "FK_misaSaOrderAssignment_assignedToId"`);
    await queryRunner.query(`ALTER TABLE "misaSaOrderAssignment" DROP CONSTRAINT IF EXISTS "FK_misaSaOrderAssignment_orderId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_misaSaOrderAssignment_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_misaSaOrderAssignment_assignedToId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_misaSaOrderAssignment_taskType"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_misaSaOrderAssignment_orderId"`);
    await queryRunner.query(`DROP TABLE "misaSaOrderAssignment"`);
  }
}
