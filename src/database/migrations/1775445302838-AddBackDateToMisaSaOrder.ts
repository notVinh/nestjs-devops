import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddBackDateToMisaSaOrder1775445302838
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'misaSaOrder',
      new TableColumn({
        name: 'backDate',
        // 'integer' là kiểu chuẩn trong PostgreSQL cho số nguyên
        type: 'integer',
        isNullable: true,
        // Bạn có thể thêm default nếu muốn, ví dụ mặc định là 0 ngày
        default: 0,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('misaSaOrder', 'backDate');
  }
}
