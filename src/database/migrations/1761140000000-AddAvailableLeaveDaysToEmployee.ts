import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvailableLeaveDaysToEmployee1761140000000
  implements MigrationInterface
{
  name = 'AddAvailableLeaveDaysToEmployee1761140000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Thêm các cột quản lý ngày phép vào bảng employee
    await queryRunner.query(
      `ALTER TABLE "employee" ADD "totalLeaveDays" DECIMAL(5,1) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "employee" ADD "usedLeaveDays" DECIMAL(5,1) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "employee" ADD "availableLeaveDays" DECIMAL(5,1) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "employee" ADD "expiringLeaveDays" DECIMAL(5,1) NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa các cột quản lý ngày phép
    await queryRunner.query(
      `ALTER TABLE "employee" DROP COLUMN "expiringLeaveDays"`,
    );
    await queryRunner.query(
      `ALTER TABLE "employee" DROP COLUMN "availableLeaveDays"`,
    );
    await queryRunner.query(
      `ALTER TABLE "employee" DROP COLUMN "usedLeaveDays"`,
    );
    await queryRunner.query(
      `ALTER TABLE "employee" DROP COLUMN "totalLeaveDays"`,
    );
  }
}
