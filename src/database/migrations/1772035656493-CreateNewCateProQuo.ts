import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateNewCateProQuo1772035656493 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tạo bảng Categories (Chỉ chứa cấu trúc cây và ảnh)
    await queryRunner.createTable(
      new Table({
        name: 'categories',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'parentId', type: 'int', isNullable: true },
          { name: 'level', type: 'int', default: 1 },
          { name: 'image', type: 'varchar', isNullable: true },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
          { name: 'deletedAt', type: 'timestamptz', isNullable: true },
        ],
      }),
      true
    );

    // 2. Tạo bảng categoryTranslations (Đa ngôn ngữ cho Category)
    await queryRunner.createTable(
      new Table({
        name: 'categoryTranslations',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'languageCode', type: 'varchar', length: '10' },
          { name: 'name', type: 'varchar' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'slug', type: 'varchar' },
          { name: 'categoryId', type: 'int' },
        ],
      }),
      true
    );

    // 3. Tạo bảng Products
    await queryRunner.createTable(
      new Table({
        name: 'products',
        columns: [
          { name: 'id', type: 'varchar', length: '50', isPrimary: true },
          {
            name: 'price',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'originalPrice',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          { name: 'brand', type: 'varchar', isNullable: true },
          { name: 'specs', type: 'jsonb', isNullable: true },
          { name: 'images', type: 'jsonb', isNullable: true },
          { name: 'categoryId', type: 'int', isNullable: true },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
          { name: 'deletedAt', type: 'timestamptz', isNullable: true },
        ],
      }),
      true
    );

    // 4. Tạo bảng productTranslations (Đa ngôn ngữ cho Product)
    await queryRunner.createTable(
      new Table({
        name: 'productTranslations',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'languageCode', type: 'varchar', length: '10' },
          { name: 'name', type: 'text' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'slug', type: 'text' },
          { name: 'features', type: 'jsonb', isNullable: true },
          { name: 'specs', type: 'jsonb', isNullable: true },
          { name: 'productId', type: 'varchar', length: '50' },
        ],
      }),
      true
    );

    // 5. Tạo bảng Quotations (Đơn báo giá)
    await queryRunner.createTable(
      new Table({
        name: 'quotations',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'customerName', type: 'varchar' },
          { name: 'customerEmail', type: 'varchar' },
          { name: 'customerPhone', type: 'varchar' },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'status', type: 'varchar', default: "'pending'" },
          {
            name: 'totalPrice',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true
    );

    // 6. Tạo bảng Quotation Items
    await queryRunner.createTable(
      new Table({
        name: 'quotationItems',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'quotationId', type: 'int' },
          { name: 'productId', type: 'varchar', length: '50' },
          { name: 'quantity', type: 'int', default: 1 },
          {
            name: 'unitPrice',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: true,
          },
        ],
      }),
      true
    );

    // --- THIẾT LẬP FOREIGN KEYS ---

    // FK cho categories (Self-referencing)
    await queryRunner.createForeignKey(
      'categories',
      new TableForeignKey({
        columnNames: ['parentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'categories',
        onDelete: 'CASCADE',
      })
    );

    // FK cho categoryTranslations
    await queryRunner.createForeignKey(
      'categoryTranslations',
      new TableForeignKey({
        columnNames: ['categoryId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'categories',
        onDelete: 'CASCADE',
      })
    );

    // FK cho products
    await queryRunner.createForeignKey(
      'products',
      new TableForeignKey({
        columnNames: ['categoryId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'categories',
        onDelete: 'SET NULL',
      })
    );

    // FK cho productTranslations
    await queryRunner.createForeignKey(
      'productTranslations',
      new TableForeignKey({
        columnNames: ['productId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'products',
        onDelete: 'CASCADE',
      })
    );

    // FK cho quotationItems
    await queryRunner.createForeignKey(
      'quotationItems',
      new TableForeignKey({
        columnNames: ['quotationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'quotations',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Thứ tự xóa ngược lại để không bị lỗi ràng buộc
    await queryRunner.dropTable('quotationItems');
    await queryRunner.dropTable('quotations');
    await queryRunner.dropTable('productTranslations');
    await queryRunner.dropTable('products');
    await queryRunner.dropTable('categoryTranslations');
    await queryRunner.dropTable('categories');
  }
}
