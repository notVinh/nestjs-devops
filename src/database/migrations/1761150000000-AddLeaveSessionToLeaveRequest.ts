import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLeaveSessionToLeaveRequest1761150000000
  implements MigrationInterface
{
  name = 'AddLeaveSessionToLeaveRequest1761150000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "leaveRequest" ADD "leaveSession" varchar(20) NOT NULL DEFAULT 'full_day'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "leaveRequest" DROP COLUMN "leaveSession"`
    );
  }
}
