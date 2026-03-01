import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedDefaultLeaveTypes1765700000000 implements MigrationInterface {
  name = 'SeedDefaultLeaveTypes1765700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Lấy tất cả factory hiện có
    const factories = await queryRunner.query(
      `SELECT id FROM "factory" WHERE "deletedAt" IS NULL`
    );

    // Định nghĩa các loại nghỉ phép mặc định
    const defaultLeaveTypes = [
      {
        code: 'ANNUAL_LEAVE',
        name: 'Phép năm',
        isPaid: true,
        deductsFromAnnualLeave: true,
        description: 'Nghỉ phép năm theo quy định',
        sortOrder: 1,
      },
      {
        code: 'PERSONAL_PAID',
        name: 'Việc riêng có hưởng lương',
        isPaid: true,
        deductsFromAnnualLeave: false,
        description: 'Nghỉ việc riêng có hưởng lương (cưới, tang, v.v.)',
        sortOrder: 2,
      },
      {
        code: 'PERSONAL_UNPAID',
        name: 'Việc riêng không hưởng lương',
        isPaid: false,
        deductsFromAnnualLeave: false,
        description: 'Nghỉ việc riêng không hưởng lương',
        sortOrder: 3,
      },
      {
        code: 'SICK_LEAVE',
        name: 'Ốm đau/Thai sản',
        isPaid: true,
        deductsFromAnnualLeave: false,
        description: 'Nghỉ ốm đau hoặc thai sản theo chế độ BHXH',
        sortOrder: 4,
      },
    ];

    // Insert loại nghỉ phép mặc định cho từng factory
    for (const factory of factories) {
      for (const leaveType of defaultLeaveTypes) {
        await queryRunner.query(
          `INSERT INTO "leaveType" ("factoryId", "code", "name", "isPaid", "deductsFromAnnualLeave", "description", "isActive", "sortOrder", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, true, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            factory.id,
            leaveType.code,
            leaveType.name,
            leaveType.isPaid,
            leaveType.deductsFromAnnualLeave,
            leaveType.description,
            leaveType.sortOrder,
          ]
        );
      }
    }

    // ===== MIGRATE DỮ LIỆU CŨ =====
    // Map leaveRequest cũ có leaveType='paid' → ANNUAL_LEAVE
    // Map leaveRequest cũ có leaveType='unpaid' → PERSONAL_UNPAID

    for (const factory of factories) {
      // Lấy ID của ANNUAL_LEAVE cho factory này
      const annualLeave = await queryRunner.query(
        `SELECT id FROM "leaveType" WHERE "factoryId" = $1 AND "code" = 'ANNUAL_LEAVE' AND "deletedAt" IS NULL LIMIT 1`,
        [factory.id]
      );

      // Lấy ID của PERSONAL_UNPAID cho factory này
      const personalUnpaid = await queryRunner.query(
        `SELECT id FROM "leaveType" WHERE "factoryId" = $1 AND "code" = 'PERSONAL_UNPAID' AND "deletedAt" IS NULL LIMIT 1`,
        [factory.id]
      );

      // Update các leaveRequest có leaveType='paid' và chưa có leaveTypeId
      if (annualLeave && annualLeave.length > 0) {
        await queryRunner.query(
          `UPDATE "leaveRequest"
           SET "leaveTypeId" = $1
           WHERE "factoryId" = $2
             AND "leaveType" = 'paid'
             AND "leaveTypeId" IS NULL`,
          [annualLeave[0].id, factory.id]
        );
      }

      // Update các leaveRequest có leaveType='unpaid' và chưa có leaveTypeId
      if (personalUnpaid && personalUnpaid.length > 0) {
        await queryRunner.query(
          `UPDATE "leaveRequest"
           SET "leaveTypeId" = $1
           WHERE "factoryId" = $2
             AND "leaveType" = 'unpaid'
             AND "leaveTypeId" IS NULL`,
          [personalUnpaid[0].id, factory.id]
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reset leaveTypeId về NULL cho các record đã migrate
    await queryRunner.query(
      `UPDATE "leaveRequest" SET "leaveTypeId" = NULL WHERE "leaveTypeId" IS NOT NULL`
    );

    // Xóa tất cả dữ liệu seed
    await queryRunner.query(
      `DELETE FROM "leaveType" WHERE "code" IN ('ANNUAL_LEAVE', 'PERSONAL_PAID', 'PERSONAL_UNPAID', 'SICK_LEAVE')`
    );
  }
}
