import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationTables1762700000000
  implements MigrationInterface
{
  name = 'CreateNotificationTables1762700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create notification_token table
    await queryRunner.query(`
      CREATE TABLE "notificationToken" (
        id BIGSERIAL NOT NULL,
        "userId" BIGINT NOT NULL,
        "fcmToken" CHARACTER VARYING(255) NOT NULL,
        "status" SMALLINT NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_notification_token" PRIMARY KEY (id)
      )
    `);

    // Create notification table
    await queryRunner.query(`
      CREATE TABLE "notification" (
        id BIGSERIAL NOT NULL,
        "title" CHARACTER VARYING(255) NOT NULL,
        "body" CHARACTER VARYING(255) NOT NULL,
        "notificationTokenIds" BIGINT[] NOT NULL,
        "statusCd" SMALLINT NOT NULL DEFAULT 0,
        "userId" BIGINT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_notification" PRIMARY KEY (id)
      )
    `);

    // Create indexes for better query performance
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notification_token_user" ON "notificationToken" ("userId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notification_token_fcm" ON "notificationToken" ("fcmToken")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notification_user" ON "notification" ("userId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notification_status" ON "notification" ("statusCd")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notification_created" ON "notification" ("createdAt")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_user"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notification_token_fcm"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notification_token_user"`
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE "notification"`);
    await queryRunner.query(`DROP TABLE "notificationToken"`);
  }
}
