import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOrderProduct1773483506983 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Thêm cột order vào bảng products

    await queryRunner.addColumn(
      'products',
      new TableColumn({
        name: 'order',
        type: 'int',
        default: 0,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Lưu ý: Thứ tự drop nên ngược lại hoặc không quan trọng nếu không có khóa ngoại liên quan
    await queryRunner.dropColumn('products', 'order');
  }
}
