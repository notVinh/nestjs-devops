import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixFactoryLocationFormat1761110000000 implements MigrationInterface {
  name = 'FixFactoryLocationFormat1761110000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Swap latitude và longitude trong location
    // Dữ liệu cũ: (lat, lng) -> Dữ liệu mới: (lng, lat)
    // Sử dụng array index vì location là kiểu point, không phải geometry
    await queryRunner.query(`
      UPDATE factory
      SET location = point(location[1], location[0])
      WHERE location IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Swap lại nếu rollback
    await queryRunner.query(`
      UPDATE factory
      SET location = point(location[1], location[0])
      WHERE location IS NOT NULL
    `);
  }
}
