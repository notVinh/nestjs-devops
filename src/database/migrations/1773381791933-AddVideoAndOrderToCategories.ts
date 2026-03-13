import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddVideoAndOrderToCategories1773381791933
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Thêm cột order vào bảng categories
    await queryRunner.addColumn(
      'categories',
      new TableColumn({
        name: 'order',
        type: 'int',
        default: 0,
      })
    );

    // Thêm cột videos vào bảng products
    await queryRunner.addColumn(
      'products',
      new TableColumn({
        name: 'videos',
        type: 'jsonb', // Nếu dùng PostgreSQL hãy dùng "text" hoặc "jsonb"
        isNullable: true,
        default: "'[]'", // Giá trị mặc định là mảng rỗng trong JSON
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Lưu ý: Thứ tự drop nên ngược lại hoặc không quan trọng nếu không có khóa ngoại liên quan
    await queryRunner.dropColumn('products', 'videos');
    await queryRunner.dropColumn('categories', 'order');
  }
}
