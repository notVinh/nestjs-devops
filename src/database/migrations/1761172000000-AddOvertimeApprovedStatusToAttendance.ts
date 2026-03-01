import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOvertimeApprovedStatusToAttendance1761172000000 implements MigrationInterface {
  name = 'AddOvertimeApprovedStatusToAttendance1761172000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the status column is using an enum type
    // If using varchar with check constraint, we need to update the constraint
    // If using enum type, we need to add the new value

    // For PostgreSQL varchar with check constraint approach:
    // First, check if there's a check constraint
    const checkConstraints = await queryRunner.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'attendance'::regclass
      AND contype = 'c'
      AND conname LIKE '%status%'
    `);

    if (checkConstraints.length > 0) {
      // Drop old constraint
      await queryRunner.query(`
        ALTER TABLE "attendance" DROP CONSTRAINT IF EXISTS "CHK_attendance_status"
      `);
    }

    // Add new check constraint with overtime_approved included
    await queryRunner.query(`
      ALTER TABLE "attendance"
      ADD CONSTRAINT "CHK_attendance_status"
      CHECK (status IN ('present', 'late', 'earlyLeave', 'absent', 'onLeave', 'businessTrip', 'remote', 'overtime_approved'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the constraint
    await queryRunner.query(`
      ALTER TABLE "attendance" DROP CONSTRAINT IF EXISTS "CHK_attendance_status"
    `);

    // Add back the old constraint without overtime_approved
    await queryRunner.query(`
      ALTER TABLE "attendance"
      ADD CONSTRAINT "CHK_attendance_status"
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
