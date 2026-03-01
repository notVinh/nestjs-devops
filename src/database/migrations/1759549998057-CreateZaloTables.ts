import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateZaloTables1759549998057 implements MigrationInterface {
  name = 'CreateZaloTables1759549998057';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "zaloOa" (
        "id" SERIAL NOT NULL, 
        "oaId" character varying NOT NULL, 
        "oaName" character varying NOT NULL, 
        "accessToken" text NOT NULL, 
        "refreshToken" text, 
        "expiresAt" TIMESTAMP NOT NULL, 
        "isActive" boolean NOT NULL DEFAULT true, 
        "factoryId" integer NOT NULL, 
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "deletedAt" TIMESTAMP, CONSTRAINT "UQ_1c54f52931a57d6737918bf028f" UNIQUE ("oaId"), 
        CONSTRAINT "PK_bc9d688c2cf54a4d69a2fbec377" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "zaloMessages" (
        "id" SERIAL NOT NULL, 
        "content" text NOT NULL,
        "templateId" integer,
        "templateName" character varying,
        "messageType" character varying NOT NULL DEFAULT 'text',
        "status" character varying NOT NULL DEFAULT 'pending',
        "totalRecipients" integer NOT NULL DEFAULT '0',
        "sentCount" integer NOT NULL DEFAULT '0',
        "failedCount" integer NOT NULL DEFAULT '0',
        "factoryId" integer NOT NULL,
        "createdBy" integer NOT NULL,
        "zaloOaId" integer NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_72c61aff4f7e2dc9ef043333741" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "zaloMessageRecipients" (
        "id" SERIAL NOT NULL,
        "messageId" integer NOT NULL, 
        "employeeId" integer NOT NULL, 
        "factoryId" integer NOT NULL,
        "phoneNumber" character varying NOT NULL, 
        "zaloUserId" character varying, 
        "status" character varying NOT NULL DEFAULT 'pending', 
        "zaloMessageId" character varying, 
        "errorMessage" text, "sentAt" TIMESTAMP, 
        "deliveredAt" TIMESTAMP, "readAt" TIMESTAMP, 
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "deletedAt" TIMESTAMP, CONSTRAINT "PK_2d266023ffc214cff48377c8268" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "zaloMessageTemplates" (
        "id" SERIAL NOT NULL, 
        "name" character varying NOT NULL, 
        "content" text NOT NULL, 
        "type" character varying NOT NULL, 
        "isActive" boolean NOT NULL DEFAULT true, 
        "factoryId" integer NOT NULL, 
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), 
        "deletedAt" TIMESTAMP, 
        CONSTRAINT "PK_32c76c057dc476849d5fe95523a" PRIMARY KEY ("id"))`
    );

    await queryRunner.query(
      `ALTER TABLE "zaloOa" ADD CONSTRAINT "FK_c737a5306f7483953f570c8c7b9" FOREIGN KEY ("factoryId") REFERENCES "factory"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "zaloMessages" ADD CONSTRAINT "FK_ed03751a675f2c5dd9b6cfc7785" FOREIGN KEY ("factoryId") REFERENCES "factory"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "zaloMessages" ADD CONSTRAINT "FK_c6ba10ee8d0068ee66fd81b8141" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "zaloMessages" ADD CONSTRAINT "FK_e14a477c4a739916537bd887aba" FOREIGN KEY ("zaloOaId") REFERENCES "zaloOa"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "zaloMessageRecipients" ADD CONSTRAINT "FK_75f5cd93ce7be3aa0e631c5bcc6" FOREIGN KEY ("messageId") REFERENCES "zaloMessages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "zaloMessageRecipients" ADD CONSTRAINT "FK_2d823a0718868d2327eac4f84e5" FOREIGN KEY ("employeeId") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "zaloMessageRecipients" ADD CONSTRAINT "FK_ed14543f8620c3ef7ce9e2d652c" FOREIGN KEY ("factoryId") REFERENCES "factory"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "zaloMessageTemplates"`);
    await queryRunner.query(`DROP TABLE "zaloMessageRecipients"`);
    await queryRunner.query(`DROP TABLE "zaloMessages"`);
    await queryRunner.query(`DROP TABLE "zaloOa"`);
  }
}
