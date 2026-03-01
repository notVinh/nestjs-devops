import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEarlyLeaveToAttendance1761160000000
  implements MigrationInterface
{
  name = 'AddEarlyLeaveToAttendance1761160000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "attendance" ADD "isEarlyLeave" boolean NOT NULL DEFAULT false`
    );
    await queryRunner.query(
      `ALTER TABLE "attendance" ADD "earlyLeaveMinutes" integer NOT NULL DEFAULT 0`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "attendance" DROP COLUMN "earlyLeaveMinutes"`
    );
    await queryRunner.query(
      `ALTER TABLE "attendance" DROP COLUMN "isEarlyLeave"`
    );
  }
}
