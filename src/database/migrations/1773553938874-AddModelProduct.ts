import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddModelProduct1773553938874 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'products', // Tên bảng của bạn
      new TableColumn({
        name: 'model',
        type: 'varchar',
        isNullable: true, // Để true nếu bạn đã có dữ liệu cũ
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('products', 'model');
  }
}
