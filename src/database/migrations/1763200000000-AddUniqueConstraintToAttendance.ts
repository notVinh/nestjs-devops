import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintToAttendance1763200000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Xóa các bản ghi trùng lặp nếu có (giữ lại bản ghi mới nhất)
    await queryRunner.query(`
      DELETE FROM attendance a
      USING attendance b
      WHERE a.id < b.id
        AND a."employeeId" = b."employeeId"
        AND a."attendanceDate" = b."attendanceDate";
    `);

    // Thêm unique constraint
    await queryRunner.query(`
      ALTER TABLE attendance
      ADD CONSTRAINT "UQ_attendance_employee_date"
      UNIQUE ("employeeId", "attendanceDate");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa unique constraint
    await queryRunner.query(`
      ALTER TABLE attendance
      DROP CONSTRAINT IF EXISTS "UQ_attendance_employee_date";
    `);
  }
}
