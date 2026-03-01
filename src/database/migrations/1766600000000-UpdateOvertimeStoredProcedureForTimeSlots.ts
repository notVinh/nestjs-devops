import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateOvertimeStoredProcedureForTimeSlots1766600000000
  implements MigrationInterface
{
  name = 'UpdateOvertimeStoredProcedureForTimeSlots1766600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tạo stored procedure MỚI để hỗ trợ nhiều khung giờ (timeSlots)
    // Giữ nguyên function cũ để backward compatible
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION handle_overtime_approval_v2(
        p_overtime_id INT,
        p_employee_id INT,
        p_factory_id INT,
        p_overtime_date TIMESTAMP,
        p_total_hours DECIMAL
      )
      RETURNS TABLE(
        excess_hours DECIMAL,
        actual_status VARCHAR
      ) AS $$
      DECLARE
        v_attendance RECORD;
        v_time_slots JSONB;
        v_start_time VARCHAR;
        v_end_time VARCHAR;
        v_planned_start TIMESTAMP;
        v_planned_start_ms BIGINT;
        v_actual_hours DECIMAL;
        v_excess DECIMAL;
        v_status VARCHAR;
        v_payable_hours DECIMAL;
        v_overtime_note TEXT;
        v_slot RECORD;
        v_slot_start TIMESTAMP;
        v_slot_end TIMESTAMP;
        v_slot_start_ms BIGINT;
        v_slot_end_ms BIGINT;
        v_checkout_ms BIGINT;
        v_checkin_ms BIGINT;
        v_total_actual_hours DECIMAL := 0;
        v_slot_hours DECIMAL;
        v_actual_start_ms BIGINT;
        v_actual_end_ms BIGINT;
      BEGIN
        -- Lấy thông tin chấm công của ngày này
        SELECT * INTO v_attendance
        FROM attendance
        WHERE "employeeId" = p_employee_id
          AND "attendanceDate" = DATE(p_overtime_date);

        -- Lấy timeSlots từ overtime table
        SELECT "timeSlots", "startTime", "endTime"
        INTO v_time_slots, v_start_time, v_end_time
        FROM overtime
        WHERE id = p_overtime_id;

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
        v_checkout_ms := EXTRACT(EPOCH FROM v_attendance."checkOutTime")::BIGINT * 1000;
        
        -- Lấy checkInTime (nếu có) để tính từ thời điểm chấm công vào
        IF v_attendance."checkInTime" IS NOT NULL THEN
          v_checkin_ms := EXTRACT(EPOCH FROM v_attendance."checkInTime")::BIGINT * 1000;
        ELSE
          -- Nếu không có checkInTime, dùng checkoutTime làm mốc (trường hợp đặc biệt)
          v_checkin_ms := v_checkout_ms;
        END IF;

        -- Nếu có timeSlots (nhiều khung giờ), tính giờ thực tế trong từng khung giờ
        IF v_time_slots IS NOT NULL AND jsonb_array_length(v_time_slots) > 0 THEN
          -- Duyệt qua từng khung giờ
          -- Sử dụng cách truy cập đúng cho jsonb_array_elements
          FOR v_slot IN 
            SELECT value FROM jsonb_array_elements(v_time_slots)
          LOOP
            -- Parse startTime và endTime từ JSON
            -- v_slot.value là jsonb object chứa startTime và endTime
            v_slot_start := DATE(p_overtime_date) + (v_slot.value->>'startTime')::TIME;
            v_slot_end := DATE(p_overtime_date) + (v_slot.value->>'endTime')::TIME;
            
            -- Xử lý ca qua đêm: nếu endTime < startTime, cộng thêm 1 ngày
            IF v_slot_end < v_slot_start THEN
              v_slot_end := v_slot_end + INTERVAL '1 day';
            END IF;

            v_slot_start_ms := EXTRACT(EPOCH FROM v_slot_start)::BIGINT * 1000;
            v_slot_end_ms := EXTRACT(EPOCH FROM v_slot_end)::BIGINT * 1000;

            -- Tính điểm bắt đầu thực tế: max(slot_start, checkInTime)
            -- Tính điểm kết thúc thực tế: min(slot_end, checkoutTime)
            -- Điểm bắt đầu: lấy thời điểm muộn hơn giữa slot_start và checkInTime
            v_actual_start_ms := GREATEST(v_slot_start_ms, v_checkin_ms);
            
            -- Điểm kết thúc: lấy thời điểm sớm hơn giữa slot_end và checkoutTime
            v_actual_end_ms := LEAST(v_slot_end_ms, v_checkout_ms);
            
            -- Chỉ tính nếu có khoảng thời gian hợp lệ (actual_end > actual_start)
            -- Và phải nằm trong khung giờ (checkout >= slot_start và checkIn <= slot_end)
            IF v_actual_end_ms > v_actual_start_ms 
               AND v_checkout_ms >= v_slot_start_ms 
               AND v_checkin_ms <= v_slot_end_ms THEN
              v_slot_hours := (v_actual_end_ms - v_actual_start_ms) / 3600000.0;
              v_total_actual_hours := v_total_actual_hours + v_slot_hours;
            END IF;
          END LOOP;

          v_actual_hours := ROUND(v_total_actual_hours::NUMERIC, 2);
        ELSE
          -- Backward compatible: dùng startTime/endTime (1 khung giờ)
          v_planned_start := DATE(p_overtime_date) + v_start_time::TIME;
          v_planned_start_ms := EXTRACT(EPOCH FROM v_planned_start)::BIGINT * 1000;
          
          -- Tính từ max(planned_start, checkInTime) đến checkoutTime
          v_actual_start_ms := GREATEST(v_planned_start_ms, v_checkin_ms);
          v_actual_hours := (v_checkout_ms - v_actual_start_ms) / 3600.0;
          
          -- Nếu tính ra <= 0, không tính tăng ca
          IF v_actual_hours <= 0 THEN
            v_actual_hours := 0;
          END IF;
        END IF;

        -- Nếu checkout trước giờ bắt đầu dự kiến → không tính tăng ca
        IF v_actual_hours <= 0 THEN
          v_status := 'completed_early';
          v_excess := -p_total_hours;
          v_payable_hours := 0;
          
          -- Tạo message với thông tin khung giờ
          IF v_time_slots IS NOT NULL AND jsonb_array_length(v_time_slots) > 0 THEN
            v_overtime_note := 'Nhân viên checkout trước giờ bắt đầu tăng ca. Đăng ký: ' ||
              (SELECT string_agg((slot->>'startTime') || '-' || (slot->>'endTime'), ', ')
               FROM jsonb_array_elements(v_time_slots) AS slot) ||
              ', Checkout: ' || TO_CHAR(v_attendance."checkOutTime", 'HH24:MI');
          ELSE
            v_overtime_note := 'Nhân viên checkout trước giờ bắt đầu tăng ca. Đăng ký: ' ||
              v_start_time || '-' || v_end_time || ', Checkout: ' ||
              TO_CHAR(v_attendance."checkOutTime", 'HH24:MI');
          END IF;

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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa function mới, giữ nguyên function cũ
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS handle_overtime_approval_v2(INT, INT, INT, TIMESTAMP, DECIMAL);
    `);
  }
}

