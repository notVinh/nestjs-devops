import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCoefficientNameToOvertime1761133000000
  implements MigrationInterface
{
  name = 'AddCoefficientNameToOvertime1761133000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Thêm cột coefficientName vào bảng overtime để lưu snapshot tên ca làm thêm
    await queryRunner.query(
      `ALTER TABLE "overtime" ADD "coefficientName" VARCHAR(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa cột coefficientName
    await queryRunner.query(
      `ALTER TABLE "overtime" DROP COLUMN "coefficientName"`,
    );
  }
}
