import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameOrderPermissions1764800000000 implements MigrationInterface {
  name = 'RenameOrderPermissions1764800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Đổi tên permission cũ 'receive_order_creation_notification' thành 'view_all_orders'
    await queryRunner.query(`
      UPDATE "employee"
      SET "permissions" = array_replace("permissions", 'receive_order_creation_notification', 'view_all_orders')
      WHERE 'receive_order_creation_notification' = ANY("permissions")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: đổi lại tên cũ
    await queryRunner.query(`
      UPDATE "employee"
      SET "permissions" = array_replace("permissions", 'view_all_orders', 'receive_order_creation_notification')
      WHERE 'view_all_orders' = ANY("permissions")
    `);
  }
}
