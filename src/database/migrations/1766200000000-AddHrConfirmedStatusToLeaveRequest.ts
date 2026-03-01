import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHrConfirmedStatusToLeaveRequest1766200000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the old constraint
    await queryRunner.query(
      `ALTER TABLE "leaveRequest" DROP CONSTRAINT IF EXISTS "leaveRequest_status_check"`,
    );

    // Add new constraint with hr_confirmed status
    await queryRunner.query(
      `ALTER TABLE "leaveRequest" ADD CONSTRAINT "leaveRequest_status_check" CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'hr_confirmed'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Do nothing - hr_confirmed status is already in use, cannot revert
    // If you need to revert, manually update all hr_confirmed records first:
    // UPDATE "leaveRequest" SET status = 'approved' WHERE status = 'hr_confirmed';
  }
}
