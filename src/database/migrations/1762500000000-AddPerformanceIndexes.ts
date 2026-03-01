import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1762500000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1762500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============ ATTENDANCE TABLE INDEXES ============
    // Index cho factoryId (query rất nhiều theo factory)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_attendance_factoryId" ON "attendance" ("factoryId")`
    );

    // Index cho employeeId (query nhiều theo employee)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_attendance_employeeId" ON "attendance" ("employeeId")`
    );

    // Index cho attendanceDate (dùng trong WHERE và BETWEEN)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_attendance_attendanceDate" ON "attendance" ("attendanceDate")`
    );

    // Composite index cho query phổ biến: factoryId + attendanceDate (export, reports)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_attendance_factory_date" ON "attendance" ("factoryId", "attendanceDate")`
    );

    // Composite index: employeeId + attendanceDate (check today attendance, get employee history)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_attendance_employee_date" ON "attendance" ("employeeId", "attendanceDate")`
    );

    // Index cho status (filtering)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_attendance_status" ON "attendance" ("status")`
    );

    // ============ OVERTIME TABLE INDEXES ============
    // Index cho factoryId
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_overtime_factoryId" ON "overtime" ("factoryId")`
    );

    // Index cho employeeId
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_overtime_employeeId" ON "overtime" ("employeeId")`
    );

    // Index cho overtimeDate
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_overtime_overtimeDate" ON "overtime" ("overtimeDate")`
    );

    // Composite index: factoryId + status (list overtime by factory with status filter)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_overtime_factory_status" ON "overtime" ("factoryId", "status")`
    );

    // Composite index: employeeId + overtimeDate + status (check approved overtime for date)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_overtime_employee_date_status" ON "overtime" ("employeeId", "overtimeDate", "status")`
    );

    // Index cho approverEmployeeId
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_overtime_approverEmployeeId" ON "overtime" ("approverEmployeeId")`
    );

    // ============ EMPLOYEE TABLE INDEXES ============
    // Index cho factoryId (query rất nhiều)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_employee_factoryId" ON "employee" ("factoryId")`
    );

    // Index cho userId (dùng để join với user table)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_employee_userId" ON "employee" ("userId")`
    );

    // Index cho departmentId (filtering và join)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_employee_departmentId" ON "employee" ("departmentId")`
    );

    // Index cho positionId (filtering và join)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_employee_positionId" ON "employee" ("positionId")`
    );

    // Composite index: factoryId + departmentId (common filter combination)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_employee_factory_department" ON "employee" ("factoryId", "departmentId")`
    );

    // ============ MAINTENANCE REPORT TABLE INDEXES ============
    // Index cho factoryId
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_maintenanceReport_factoryId" ON "maintenanceReport" ("factoryId")`
    );

    // Index cho employeeId (người báo cáo)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_maintenanceReport_employeeId" ON "maintenanceReport" ("employeeId")`
    );

    // Index cho assignedEmployeeId (người được giao xử lý)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_maintenanceReport_assignedEmployeeId" ON "maintenanceReport" ("assignedEmployeeId")`
    );

    // Composite index: factoryId + status (common query pattern)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_maintenanceReport_factory_status" ON "maintenanceReport" ("factoryId", "status")`
    );

    // Index cho reportDate (date range queries)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_maintenanceReport_reportDate" ON "maintenanceReport" ("reportDate")`
    );

    // Index cho status (filtering)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_maintenanceReport_status" ON "maintenanceReport" ("status")`
    );

    // Index cho priority (filtering)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_maintenanceReport_priority" ON "maintenanceReport" ("priority")`
    );

    // ============ ARRIVAL REPORT TABLE INDEXES ============
    // Index cho factoryId
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_arrivalReport_factoryId" ON "arrivalReport" ("factoryId")`
    );

    // Index cho employeeId
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_arrivalReport_employeeId" ON "arrivalReport" ("employeeId")`
    );

    // Index cho arrivalDate (date range queries)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_arrivalReport_arrivalDate" ON "arrivalReport" ("arrivalDate")`
    );

    // Composite index: factoryId + arrivalDate
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_arrivalReport_factory_date" ON "arrivalReport" ("factoryId", "arrivalDate")`
    );

    // Index cho status (filtering)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_arrivalReport_status" ON "arrivalReport" ("status")`
    );

    // ============ BULK OVERTIME REQUEST TABLE INDEXES ============
    // Index cho factoryId
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bulkOvertimeRequest_factoryId" ON "bulkOvertimeRequest" ("factoryId")`
    );

    // Index cho creatorEmployeeId
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bulkOvertimeRequest_creatorEmployeeId" ON "bulkOvertimeRequest" ("creatorEmployeeId")`
    );

    // Index cho status
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bulkOvertimeRequest_status" ON "bulkOvertimeRequest" ("status")`
    );

    // ============ EMPLOYEE FEEDBACK TABLE INDEXES ============
    // Index cho factoryId
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_employeeFeedback_factoryId" ON "employeeFeedback" ("factoryId")`
    );

    // Index cho employeeId
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_employeeFeedback_employeeId" ON "employeeFeedback" ("employeeId")`
    );

    // Composite index: factoryId + status
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_employeeFeedback_factory_status" ON "employeeFeedback" ("factoryId", "status")`
    );

    // Index cho status
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_employeeFeedback_status" ON "employeeFeedback" ("status")`
    );

    // ============ DAILY PRODUCTION TABLE INDEXES ============
    // Index cho factoryId
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_dailyProduction_factoryId" ON "dailyProduction" ("factoryId")`
    );

    // Index cho employeeId
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_dailyProduction_employeeId" ON "dailyProduction" ("employeeId")`
    );

    // Index cho date (date queries)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_dailyProduction_date" ON "dailyProduction" ("date")`
    );

    // Composite index: factoryId + employeeId (aggregation queries)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_dailyProduction_factory_employee" ON "dailyProduction" ("factoryId", "employeeId")`
    );

    // ============ DEPARTMENT TABLE INDEXES ============
    // Index cho factoryId
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_department_factoryId" ON "department" ("factoryId")`
    );

    // ============ POSITION EMPLOYEE TABLE INDEXES ============
    // Index cho factoryId
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_positionEmployee_factoryId" ON "positionEmployee" ("factoryId")`
    );

    // Index cho departmentId
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_positionEmployee_departmentId" ON "positionEmployee" ("departmentId")`
    );

    // ============ USER TABLE INDEXES ============
    // Index cho phone (used for lookups and joins)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_phone" ON "user" ("phone")`
    );

    // Index cho email
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_email" ON "user" ("email")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all indexes in reverse order
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_phone"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_positionEmployee_departmentId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_positionEmployee_factoryId"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_department_factoryId"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dailyProduction_factory_employee"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dailyProduction_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dailyProduction_employeeId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_dailyProduction_factoryId"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_employeeFeedback_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_employeeFeedback_factory_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_employeeFeedback_employeeId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_employeeFeedback_factoryId"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bulkOvertimeRequest_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bulkOvertimeRequest_creatorEmployeeId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bulkOvertimeRequest_factoryId"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_arrivalReport_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_arrivalReport_factory_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_arrivalReport_arrivalDate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_arrivalReport_employeeId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_arrivalReport_factoryId"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_maintenanceReport_priority"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_maintenanceReport_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_maintenanceReport_reportDate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_maintenanceReport_factory_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_maintenanceReport_assignedEmployeeId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_maintenanceReport_employeeId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_maintenanceReport_factoryId"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_employee_factory_department"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_employee_positionId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_employee_departmentId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_employee_userId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_employee_factoryId"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_overtime_approverEmployeeId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_overtime_employee_date_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_overtime_factory_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_overtime_overtimeDate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_overtime_employeeId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_overtime_factoryId"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_employee_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_factory_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_attendanceDate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_employeeId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendance_factoryId"`);
  }
}
