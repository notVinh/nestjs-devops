import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPermissionsToEmployee1763400000000
  implements MigrationInterface
{
  name = 'AddPermissionsToEmployee1763400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Thêm field permissions cho employee để quản lý quyền hạn
    // Ví dụ: 'receive_order_creation_notification', 'approve_orders', etc.
    await queryRunner.query(
      `ALTER TABLE "employee" ADD "permissions" TEXT[] DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa field permissions
    await queryRunner.query(
      `ALTER TABLE "employee" DROP COLUMN "permissions"`,
    );
  }
}
