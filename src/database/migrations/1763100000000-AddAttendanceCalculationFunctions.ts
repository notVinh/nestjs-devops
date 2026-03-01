import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttendanceCalculationFunctions1763100000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Hàm tính số phút đi muộn
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION calculate_late_minutes(
        p_check_in_time TIMESTAMP,
        p_expected_start_hour TIME
      )
      RETURNS INT AS $$
      DECLARE
        expected_time TIMESTAMP;
        diff_minutes INT;
      BEGIN
        -- Kết hợp ngày check-in với giờ bắt đầu dự kiến
        expected_time := DATE(p_check_in_time) + p_expected_start_hour;

        -- Tính chênh lệch theo phút
        diff_minutes := EXTRACT(EPOCH FROM (p_check_in_time - expected_time))::INT / 60;

        -- Trả về 0 nếu đến sớm, ngược lại trả về số phút muộn
        RETURN GREATEST(0, diff_minutes);
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);

    // Hàm tính số phút về sớm
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION calculate_early_leave_minutes(
        p_check_out_time TIMESTAMP,
        p_expected_end_hour TIME
      )
      RETURNS INT AS $$
      DECLARE
        expected_time TIMESTAMP;
        diff_minutes INT;
      BEGIN
        -- Kết hợp ngày check-out với giờ kết thúc dự kiến
        expected_time := DATE(p_check_out_time) + p_expected_end_hour;

        -- Tính chênh lệch theo phút (dương nếu về sớm)
        diff_minutes := EXTRACT(EPOCH FROM (expected_time - p_check_out_time))::INT / 60;

        -- Trả về 0 nếu đúng giờ hoặc về muộn, ngược lại trả về số phút về sớm
        RETURN GREATEST(0, diff_minutes);
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);

    // Hàm tính tổng số giờ làm việc
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION calculate_work_hours(
        p_check_in_time TIMESTAMP,
        p_check_out_time TIMESTAMP
      )
      RETURNS DECIMAL AS $$
      DECLARE
        diff_hours DECIMAL;
      BEGIN
        -- Tính chênh lệch theo giờ
        diff_hours := EXTRACT(EPOCH FROM (p_check_out_time - p_check_in_time)) / 3600;

        -- Trả về 0 nếu âm, tối đa 24 giờ
        IF diff_hours <= 0 THEN
          RETURN 0;
        ELSIF diff_hours > 24 THEN
          RETURN 24;
        ELSE
          RETURN ROUND(diff_hours::NUMERIC, 2);
        END IF;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa các functions
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS calculate_late_minutes(TIMESTAMP, TIME);
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS calculate_early_leave_minutes(TIMESTAMP, TIME);
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS calculate_work_hours(TIMESTAMP, TIMESTAMP);
    `);
  }
}
