import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixAttendanceStatusConstraint1761173000000 implements MigrationInterface {
  name = 'FixAttendanceStatusConstraint1761173000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop all existing check constraints on attendance.status
    await queryRunner.query(`
      ALTER TABLE "attendance" DROP CONSTRAINT IF EXISTS "attendance_status_check"
    `);

    await queryRunner.query(`
      ALTER TABLE "attendance" DROP CONSTRAINT IF EXISTS "CHK_attendance_status"
    `);

    await queryRunner.query(`
      ALTER TABLE "attendance" DROP CONSTRAINT IF EXISTS "CHK_status"
    `);

    // Add the correct constraint with overtime_approved
    await queryRunner.query(`
      ALTER TABLE "attendance"
      ADD CONSTRAINT "CHK_attendance_status"
      CHECK (status IN ('present', 'late', 'earlyLeave', 'absent', 'onLeave', 'businessTrip', 'remote', 'overtime_approved'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the new constraint
    await queryRunner.query(`
      ALTER TABLE "attendance" DROP CONSTRAINT IF EXISTS "CHK_attendance_status"
    `);

    // Restore the old constraint
    await queryRunner.query(`
      ALTER TABLE "attendance"
      ADD CONSTRAINT "attendance_status_check"
      CHECK (status IN ('present', 'late', 'earlyLeave', 'absent', 'onLeave', 'businessTrip', 'remote'))
    `);

    // Update any overtime_approved records to present
    await queryRunner.query(`
      UPDATE "attendance"
      SET status = 'present'
      WHERE status = 'overtime_approved'
    `);
  }
}
