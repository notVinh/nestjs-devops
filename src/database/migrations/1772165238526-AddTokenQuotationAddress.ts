import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTokenQuotationAddress1772165238526
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Thêm cột confirmationToken
    await queryRunner.addColumn(
      'quotations',
      new TableColumn({
        name: 'confirmationToken',
        type: 'varchar',
        isNullable: true,
        isUnique: true,
        comment: 'Token dùng để khách hàng xác nhận báo giá qua Gmail',
      })
    );

    // 2. Thêm cột customerAddress
    await queryRunner.addColumn(
      'quotations',
      new TableColumn({
        name: 'customerAddress',
        type: 'text', // Dùng text để khách hàng nhập địa chỉ dài thoải mái
        isNullable: true, // Để true để không lỗi với dữ liệu cũ
        comment: 'Địa chỉ nhận hàng do khách hàng cung cấp khi xác nhận',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa cột theo thứ tự ngược lại
    await queryRunner.dropColumn('quotations', 'customerAddress');
    await queryRunner.dropColumn('quotations', 'confirmationToken');
  }
}
