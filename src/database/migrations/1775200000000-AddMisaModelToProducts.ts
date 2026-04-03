import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMisaModelToProducts1775200000000 implements MigrationInterface {
  name = 'AddMisaModelToProducts1775200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'products',
      new TableColumn({
        name: 'misaModel',
        type: 'varchar',
        length: '150',
        isNullable: true,
        comment: 'Mã sản phẩm MISA để đối chiếu tồn kho (inventoryItemCode)',
      }),
    );

    // Index để tăng tốc query đối chiếu
    await queryRunner.query(
      `CREATE INDEX "IDX_products_misaModel" ON "products" ("misaModel")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_misaModel"`);
    await queryRunner.dropColumn('products', 'misaModel');
  }
}
