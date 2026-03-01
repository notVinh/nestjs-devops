import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOvertimeSupplementProcedure1766800000000
  implements MigrationInterface
{
  name = 'AddOvertimeSupplementProcedure1766800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tạo stored procedure để xử lý duyệt đơn tăng ca bổ sung
    // Procedure này sẽ tính lại giờ thực tế cho TẤT CẢ các đơn (gốc + bổ sung) cùng ngày
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION handle_overtime_supplement_approval(
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
        v_parent_overtime_id INT;
        v_time_slots JSONB;
        v_start_time VARCHAR;
        v_end_time VARCHAR;
        v_checkout_ms BIGINT;
        v_checkin_ms BIGINT;
        v_total_actual_hours DECIMAL := 0;
        v_total_planned_hours DECIMAL := 0;
        v_slot RECORD;
        v_slot_start TIMESTAMP;
        v_slot_end TIMESTAMP;
        v_slot_start_ms BIGINT;
        v_slot_end_ms BIGINT;
        v_slot_hours DECIMAL;
        v_actual_start_ms BIGINT;
        v_actual_end_ms BIGINT;
        v_overtime_record RECORD;
        v_excess DECIMAL;
        v_status VARCHAR;
        v_payable_hours DECIMAL;
        v_overtime_note TEXT;
        v_all_time_slots JSONB := '[]'::JSONB;
      BEGIN
        -- Lấy thông tin chấm công của ngày này
        SELECT * INTO v_attendance
        FROM attendance
        WHERE "employeeId" = p_employee_id
          AND "attendanceDate" = DATE(p_overtime_date);

        -- Lấy parentOvertimeId để xác định đây là đơn bổ sung
        SELECT "parentOvertimeId" INTO v_parent_overtime_id
        FROM overtime
        WHERE id = p_overtime_id;

        -- Nếu không phải đơn bổ sung, không xử lý (nên dùng handle_overtime_approval_v2)
        IF v_parent_overtime_id IS NULL THEN
          RAISE EXCEPTION 'Function handle_overtime_supplement_approval chỉ dùng cho đơn bổ sung. Đơn này không có parentOvertimeId.';
        END IF;

        -- Trường hợp 1: Nhân viên chưa checkout → cộng giờ đăng ký vào attendance
        IF v_attendance IS NULL OR v_attendance."checkOutTime" IS NULL THEN
          -- Cộng thêm giờ bổ sung vào attendance
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

        -- Trường hợp 2: Nhân viên đã checkout → tính lại giờ thực tế cho TẤT CẢ đơn cùng ngày
        -- Tình huống: Đã chấm công, đơn gốc đã được duyệt, đơn bổ sung chưa được duyệt
        -- => Khi duyệt đơn bổ sung, cần tính lại giờ tăng ca từ đầu cho TẤT CẢ đơn (gốc + bổ sung)
        -- KHÔNG cộng thêm vào attendance.overtimeHours cũ, mà SET lại = tổng giờ thực tế mới
        
        v_checkout_ms := EXTRACT(EPOCH FROM v_attendance."checkOutTime")::BIGINT * 1000;
        
        -- Lấy checkInTime (nếu có) để tính từ thời điểm chấm công vào
        IF v_attendance."checkInTime" IS NOT NULL THEN
          v_checkin_ms := EXTRACT(EPOCH FROM v_attendance."checkInTime")::BIGINT * 1000;
        ELSE
          v_checkin_ms := v_checkout_ms;
        END IF;

        -- Reset biến đếm để tính lại từ đầu
        v_total_actual_hours := 0;
        v_total_planned_hours := 0;

        -- Lấy TẤT CẢ các đơn đã approved cùng ngày (gốc + tất cả đơn bổ sung)
        -- Bao gồm cả đơn gốc và tất cả đơn bổ sung
        -- LƯU Ý: Đơn bổ sung hiện tại (p_overtime_id) có thể chưa có status = 'approved' 
        -- vì procedure được gọi trước khi status được update, nên cần include nó riêng
        FOR v_overtime_record IN
          SELECT id, "timeSlots", "startTime", "endTime", "totalHours", "parentOvertimeId"
          FROM overtime
          WHERE "employeeId" = p_employee_id
            AND "factoryId" = p_factory_id
            AND "overtimeDate" = DATE(p_overtime_date)
            AND (
              -- Đơn gốc đã approved
              (id = v_parent_overtime_id AND status = 'approved')
              OR
              -- Các đơn bổ sung khác đã approved
              ("parentOvertimeId" = v_parent_overtime_id AND status = 'approved')
              OR
              -- Đơn bổ sung hiện tại đang được duyệt (có thể chưa có status = 'approved' trong DB)
              (id = p_overtime_id)
            )
        LOOP
          -- Tính tổng giờ đăng ký
          v_total_planned_hours := v_total_planned_hours + COALESCE(v_overtime_record."totalHours", 0);

          -- Lấy timeSlots của đơn này
          IF v_overtime_record."timeSlots" IS NOT NULL AND jsonb_array_length(v_overtime_record."timeSlots") > 0 THEN
            -- Có nhiều khung giờ
            FOR v_slot IN 
              SELECT value FROM jsonb_array_elements(v_overtime_record."timeSlots")
            LOOP
              v_slot_start := DATE(p_overtime_date) + (v_slot.value->>'startTime')::TIME;
              v_slot_end := DATE(p_overtime_date) + (v_slot.value->>'endTime')::TIME;
              
              -- Xử lý ca qua đêm
              IF v_slot_end < v_slot_start THEN
                v_slot_end := v_slot_end + INTERVAL '1 day';
              END IF;

              v_slot_start_ms := EXTRACT(EPOCH FROM v_slot_start)::BIGINT * 1000;
              v_slot_end_ms := EXTRACT(EPOCH FROM v_slot_end)::BIGINT * 1000;

              -- Tính điểm bắt đầu và kết thúc thực tế
              v_actual_start_ms := GREATEST(v_slot_start_ms, v_checkin_ms);
              v_actual_end_ms := LEAST(v_slot_end_ms, v_checkout_ms);

              -- Chỉ tính nếu có khoảng thời gian hợp lệ
              IF v_actual_end_ms > v_actual_start_ms 
                 AND v_checkout_ms >= v_slot_start_ms 
                 AND v_checkin_ms <= v_slot_end_ms THEN
                v_slot_hours := (v_actual_end_ms - v_actual_start_ms) / 3600000.0;
                v_total_actual_hours := v_total_actual_hours + v_slot_hours;
              END IF;
            END LOOP;
          ELSE
            -- Backward compatible: dùng startTime/endTime
            v_slot_start := DATE(p_overtime_date) + v_overtime_record."startTime"::TIME;
            v_slot_end := DATE(p_overtime_date) + v_overtime_record."endTime"::TIME;
            
            IF v_slot_end < v_slot_start THEN
              v_slot_end := v_slot_end + INTERVAL '1 day';
            END IF;

            v_slot_start_ms := EXTRACT(EPOCH FROM v_slot_start)::BIGINT * 1000;
            v_slot_end_ms := EXTRACT(EPOCH FROM v_slot_end)::BIGINT * 1000;

            v_actual_start_ms := GREATEST(v_slot_start_ms, v_checkin_ms);
            v_actual_end_ms := LEAST(v_slot_end_ms, v_checkout_ms);

            IF v_actual_end_ms > v_actual_start_ms 
               AND v_checkout_ms >= v_slot_start_ms 
               AND v_checkin_ms <= v_slot_end_ms THEN
              v_slot_hours := (v_actual_end_ms - v_actual_start_ms) / 3600000.0;
              v_total_actual_hours := v_total_actual_hours + v_slot_hours;
            END IF;
          END IF;
        END LOOP;

        v_total_actual_hours := ROUND(v_total_actual_hours::NUMERIC, 2);
        v_total_planned_hours := ROUND(v_total_planned_hours::NUMERIC, 2);

        -- Nếu checkout trước tất cả các khung giờ
        IF v_total_actual_hours <= 0 THEN
          v_status := 'completed_early';
          v_excess := -v_total_planned_hours;
          v_payable_hours := 0;
          v_overtime_note := 'Nhân viên checkout trước giờ bắt đầu tăng ca. Tổng đăng ký: ' ||
            ROUND(v_total_planned_hours::NUMERIC, 2)::TEXT || 'h, Checkout: ' ||
            TO_CHAR(v_attendance."checkOutTime", 'HH24:MI');

          UPDATE attendance SET
            "overtimeHours" = 0,
            "overtimeNote" = v_overtime_note,
            "updatedAt" = NOW()
          WHERE id = v_attendance.id;

          RETURN QUERY SELECT v_excess, v_status;
          RETURN;
        END IF;

        -- Tính số giờ chênh lệch (so với tổng giờ đăng ký của tất cả đơn)
        v_excess := ROUND((v_total_actual_hours - v_total_planned_hours)::NUMERIC, 2);

        -- Xác định trạng thái và số giờ được thanh toán
        IF v_total_actual_hours < v_total_planned_hours THEN
          -- Về sớm hơn tổng đăng ký → trả theo giờ thực tế
          v_status := 'completed_early';
          v_payable_hours := ROUND(v_total_actual_hours::NUMERIC, 2);
          v_overtime_note := 'Nhân viên về sớm hơn ' || ROUND(ABS(v_excess)::NUMERIC, 2)::TEXT ||
            ' giờ so với tổng đăng ký. Tổng đăng ký: ' || ROUND(v_total_planned_hours::NUMERIC, 2)::TEXT ||
            'h, Thực tế: ' || ROUND(v_total_actual_hours::NUMERIC, 2)::TEXT || 'h';
        ELSIF v_total_actual_hours > v_total_planned_hours THEN
          -- Về muộn hơn tổng đăng ký → chỉ trả theo tổng giờ đã duyệt
          v_status := 'exceeded';
          v_payable_hours := v_total_planned_hours;
          v_overtime_note := 'Nhân viên làm thêm ' || ROUND(v_excess::NUMERIC, 2)::TEXT ||
            ' giờ chưa được duyệt. Tổng đăng ký: ' || ROUND(v_total_planned_hours::NUMERIC, 2)::TEXT ||
            'h, Thực tế: ' || ROUND(v_total_actual_hours::NUMERIC, 2)::TEXT || 'h';
        ELSE
          -- Đúng giờ
          v_status := 'completed';
          v_payable_hours := v_total_planned_hours;
          v_overtime_note := 'Nhân viên hoàn thành đúng tổng giờ tăng ca đã đăng ký (' ||
            ROUND(v_total_planned_hours::NUMERIC, 2)::TEXT || 'h)';
        END IF;

        -- Cập nhật attendance với tổng giờ được thanh toán (cho tất cả đơn)
        -- LƯU Ý: SET lại từ đầu, KHÔNG cộng thêm vào giá trị cũ
        -- Vì đã tính lại tổng giờ thực tế cho TẤT CẢ đơn (gốc + bổ sung)
        UPDATE attendance SET
          "overtimeHours" = v_payable_hours,
          "overtimeNote" = v_overtime_note,
          "updatedAt" = NOW()
        WHERE id = v_attendance.id;

        -- Trả về trạng thái thực tế và số giờ chênh lệch
        -- Lưu ý: excess_hours và actual_status này là cho đơn bổ sung hiện tại
        -- Nhưng được tính dựa trên tổng của tất cả đơn
        RETURN QUERY SELECT v_excess, v_status;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS handle_overtime_supplement_approval(INT, INT, INT, TIMESTAMP, DECIMAL);
    `);
  }
}

