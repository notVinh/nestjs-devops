import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLeaveRequestTrigger1762900000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tạo function tự động cập nhật số ngày phép của nhân viên khi duyệt đơn
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_employee_leave_days()
      RETURNS TRIGGER AS $$
      DECLARE
        available_days DECIMAL;
        employee_name VARCHAR;
      BEGIN
        -- Chỉ thực thi khi trạng thái chuyển từ 'pending' sang 'approved' và là nghỉ có lương
        IF OLD.status = 'pending'
           AND NEW.status = 'approved'
           AND NEW."leaveType" = 'paid'
           AND NEW."totalDays" IS NOT NULL
           AND NEW."totalDays" > 0 THEN

          -- Lấy số ngày phép còn lại và tên nhân viên để hiển thị lỗi
          SELECT
            e."availableLeaveDays",
            u."fullName"
          INTO
            available_days,
            employee_name
          FROM employee e
          LEFT JOIN "user" u ON e."userId" = u.id
          WHERE e.id = NEW."employeeId";

          -- Kiểm tra: nhân viên có đủ số ngày phép không
          IF available_days IS NULL THEN
            RAISE EXCEPTION 'Không tìm thấy nhân viên với ID %', NEW."employeeId";
          END IF;

          IF available_days < NEW."totalDays" THEN
            RAISE EXCEPTION 'Không thể duyệt. Nhân viên % chỉ còn % ngày phép, nhưng đơn xin % ngày',
              COALESCE(employee_name, 'ID: ' || NEW."employeeId"::TEXT),
              available_days,
              NEW."totalDays";
          END IF;

          -- Cập nhật số ngày phép của nhân viên (trừ số ngày còn lại, cộng số ngày đã dùng)
          UPDATE employee SET
            "availableLeaveDays" = "availableLeaveDays" - NEW."totalDays",
            "usedLeaveDays" = COALESCE("usedLeaveDays", 0) + NEW."totalDays",
            "updatedAt" = NOW()
          WHERE id = NEW."employeeId";

          -- Cập nhật thời điểm quyết định
          NEW."decidedAt" = NOW();

        END IF;

        -- Cũng cập nhật decidedAt cho trạng thái từ chối và hủy
        IF OLD.status = 'pending'
           AND NEW.status IN ('rejected', 'cancelled') THEN
          NEW."decidedAt" = NOW();
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Tạo trigger trên bảng leaveRequest (camelCase trong TypeORM)
    await queryRunner.query(`
      CREATE TRIGGER trg_update_employee_leave_days
        BEFORE UPDATE ON "leaveRequest"
        FOR EACH ROW
        EXECUTE FUNCTION update_employee_leave_days();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa trigger
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_update_employee_leave_days ON "leaveRequest";
    `);

    // Xóa function
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS update_employee_leave_days();
    `);
  }
}
