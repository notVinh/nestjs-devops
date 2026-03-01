import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTimeSlotsToOvertime1766500000000 implements MigrationInterface {
  name = 'AddTimeSlotsToOvertime1766500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Thêm column timeSlots (JSONB) để lưu nhiều khung giờ tăng ca
    await queryRunner.query(`
      ALTER TABLE "overtime" 
      ADD COLUMN IF NOT EXISTS "timeSlots" JSONB;
    `);

    // Migrate dữ liệu cũ: chuyển startTime/endTime thành timeSlots array
    await queryRunner.query(`
      UPDATE "overtime"
      SET "timeSlots" = jsonb_build_array(
        jsonb_build_object(
          'startTime', "startTime",
          'endTime', "endTime"
        )
      )
      WHERE "timeSlots" IS NULL;
    `);

    // Tạo index cho timeSlots để query nhanh hơn
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_overtime_timeSlots" 
      ON "overtime" USING GIN ("timeSlots");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_overtime_timeSlots";
    `);

    // Xóa column timeSlots
    await queryRunner.query(`
      ALTER TABLE "overtime" 
      DROP COLUMN IF EXISTS "timeSlots";
    `);
  }
}

