import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOvertimeStoredProcedures1763000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tạo stored procedure xử lý duyệt đơn tăng ca và tính toán giờ thực tế
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION handle_overtime_approval(
        p_overtime_id INT,
        p_employee_id INT,
        p_factory_id INT,
        p_overtime_date TIMESTAMP,
        p_start_time VARCHAR,
        p_total_hours DECIMAL
      )
      RETURNS TABLE(
        excess_hours DECIMAL,
        actual_status VARCHAR
      ) AS $$
      DECLARE
        v_attendance RECORD;
        v_planned_start TIMESTAMP;
        v_actual_hours DECIMAL;
        v_excess DECIMAL;
        v_status VARCHAR;
        v_payable_hours DECIMAL;
        v_overtime_note TEXT;
      BEGIN
        -- Lấy thông tin chấm công của ngày này
        SELECT * INTO v_attendance
        FROM attendance
        WHERE "employeeId" = p_employee_id
          AND "attendanceDate" = DATE(p_overtime_date);

        -- Trường hợp 1: Nhân viên chưa checkout → cộng giờ đăng ký vào attendance
        IF v_attendance IS NULL OR v_attendance."checkOutTime" IS NULL THEN
          -- Thêm hoặc cập nhật attendance với số giờ tăng ca đã đăng ký
          INSERT INTO attendance (
            "employeeId",
            "factoryId",
            "attendanceDate",
            "overtimeHours",
            status,
            "createdAt",
            "updatedAt"
          )
          VALUES (
            p_employee_id,
            p_factory_id,
            DATE(p_overtime_date),
            p_total_hours,
            'overtime_approved',
            NOW(),
            NOW()
          )
          ON CONFLICT ("employeeId", "attendanceDate")
          DO UPDATE SET
            "overtimeHours" = COALESCE(attendance."overtimeHours", 0) + p_total_hours,
            "updatedAt" = NOW();

          -- Trả về trạng thái pending (chưa có giờ thực tế)
          RETURN QUERY SELECT 0::DECIMAL, 'pending'::VARCHAR;
          RETURN;
        END IF;

        -- Trường hợp 2: Nhân viên đã checkout → tính giờ thực tế
        -- Tạo thời điểm bắt đầu dự kiến từ overtime_date + start_time
        v_planned_start := DATE(p_overtime_date) + p_start_time::TIME;

        -- Tính số giờ tăng ca thực tế (từ giờ bắt đầu dự kiến đến giờ checkout thực tế)
        v_actual_hours := EXTRACT(EPOCH FROM (v_attendance."checkOutTime" - v_planned_start)) / 3600;

        -- Nếu checkout trước giờ bắt đầu dự kiến → không tính tăng ca
        IF v_actual_hours <= 0 THEN
          v_status := 'completed_early';
          v_excess := -p_total_hours;
          v_payable_hours := 0;
          v_overtime_note := 'Nhân viên checkout trước giờ bắt đầu tăng ca. Đăng ký: ' ||
            p_start_time || '-' || 'endTime' || ', Checkout: ' ||
            TO_CHAR(v_attendance."checkOutTime", 'HH24:MI');

          UPDATE attendance SET
            "overtimeHours" = 0,
            "overtimeNote" = v_overtime_note,
            "updatedAt" = NOW()
          WHERE id = v_attendance.id;

          RETURN QUERY SELECT v_excess, v_status;
          RETURN;
        END IF;

        -- Tính số giờ chênh lệch
        v_excess := ROUND((v_actual_hours - p_total_hours)::NUMERIC, 2);

        -- Xác định trạng thái và số giờ được thanh toán
        IF v_actual_hours < p_total_hours THEN
          -- Về sớm hơn đăng ký → trả theo giờ thực tế
          v_status := 'completed_early';
          v_payable_hours := ROUND(v_actual_hours::NUMERIC, 2);
          v_overtime_note := 'Nhân viên về sớm hơn ' || ROUND(ABS(v_excess)::NUMERIC, 2)::TEXT ||
            ' giờ so với đăng ký. Đăng ký: ' || ROUND(p_total_hours::NUMERIC, 2)::TEXT ||
            'h, Thực tế: ' || ROUND(v_actual_hours::NUMERIC, 2)::TEXT || 'h';
        ELSIF v_actual_hours > p_total_hours THEN
          -- Về muộn hơn đăng ký → chỉ trả theo giờ đã duyệt
          v_status := 'exceeded';
          v_payable_hours := p_total_hours;
          v_overtime_note := 'Nhân viên làm thêm ' || ROUND(v_excess::NUMERIC, 2)::TEXT ||
            ' giờ chưa được duyệt. Đăng ký: ' || ROUND(p_total_hours::NUMERIC, 2)::TEXT ||
            'h, Thực tế: ' || ROUND(v_actual_hours::NUMERIC, 2)::TEXT || 'h';
        ELSE
          -- Đúng giờ
          v_status := 'completed';
          v_payable_hours := p_total_hours;
          v_overtime_note := 'Nhân viên hoàn thành đúng giờ tăng ca đã đăng ký (' ||
            ROUND(p_total_hours::NUMERIC, 2)::TEXT || 'h)';
        END IF;

        -- Cập nhật attendance với số giờ được thanh toán
        UPDATE attendance SET
          "overtimeHours" = v_payable_hours,
          "overtimeNote" = v_overtime_note,
          "updatedAt" = NOW()
        WHERE id = v_attendance.id;

        -- Trả về trạng thái thực tế và số giờ chênh lệch
        RETURN QUERY SELECT v_excess, v_status;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Tạo stored procedure để trừ giờ tăng ca khi hủy đơn đã duyệt
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION subtract_overtime_hours(
        p_employee_id INT,
        p_overtime_date TIMESTAMP,
        p_total_hours DECIMAL
      )
      RETURNS VOID AS $$
      DECLARE
        v_attendance RECORD;
      BEGIN
        -- Lấy thông tin chấm công của ngày này
        SELECT * INTO v_attendance
        FROM attendance
        WHERE "employeeId" = p_employee_id
          AND "attendanceDate" = DATE(p_overtime_date);

        -- Nếu attendance tồn tại, trừ số giờ tăng ca
        IF v_attendance IS NOT NULL THEN
          UPDATE attendance SET
            "overtimeHours" = GREATEST(0, COALESCE("overtimeHours", 0) - p_total_hours),
            "updatedAt" = NOW()
          WHERE id = v_attendance.id;
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa stored procedures
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS handle_overtime_approval(INT, INT, INT, TIMESTAMP, VARCHAR, DECIMAL);
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS subtract_overtime_hours(INT, TIMESTAMP, DECIMAL);
    `);
  }
}
