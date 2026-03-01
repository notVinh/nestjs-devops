import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomWorkingHoursToEmployee1762600000000
  implements MigrationInterface
{
  name = 'AddCustomWorkingHoursToEmployee1762600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Thêm giờ làm việc riêng cho nhân viên (nếu có thì ưu tiên hơn giờ của nhà máy)
    await queryRunner.query(
      `ALTER TABLE "employee" ADD "hourStartWork" TIME(0) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "employee" ADD "hourEndWork" TIME(0) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa giờ làm việc riêng của nhân viên
    await queryRunner.query(
      `ALTER TABLE "employee" DROP COLUMN "hourEndWork"`,
    );
    await queryRunner.query(
      `ALTER TABLE "employee" DROP COLUMN "hourStartWork"`,
    );
  }
}
