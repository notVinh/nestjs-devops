import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomerCareFeature1776239641400
  implements MigrationInterface
{
  name = 'CreateCustomerCareFeature1776439641400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Thêm cột location vào misaCustomer
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "location" point`
    );

    // 2. Tạo bảng customerCare
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customerCare" (
        "id" BIGSERIAL PRIMARY KEY,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "customerId" bigint NOT NULL,
        "employeeId" bigint NOT NULL,
        "date" date NOT NULL,
        "checkInTime" TIMESTAMP NOT NULL,
        "checkOutTime" TIMESTAMP,
        "checkInLocation" point,
        "checkOutLocation" point,
        "status" varchar(20) NOT NULL DEFAULT 'checking_in',
        "checkInNote" text,
        "checkOutNote" text,
        "checkInPhotoUrls" jsonb,
        "checkOutPhotoUrls" jsonb,
        "stayDurationMinutes" int,
        "distanceMeters" numeric(10,2)
      )
    `);

    // 3. Thêm constraints cho customerCare
    await queryRunner.query(`
      ALTER TABLE "customerCare"
      ADD CONSTRAINT "FK_customerCare_customerId"
      FOREIGN KEY ("customerId") REFERENCES "misaCustomer"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "customerCare"
      ADD CONSTRAINT "FK_customerCare_employeeId"
      FOREIGN KEY ("employeeId") REFERENCES "employee"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // 4. Các Index
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_customerCare_customerId" ON "customerCare" ("customerId");
      CREATE INDEX IF NOT EXISTS "IDX_customerCare_employeeId" ON "customerCare" ("employeeId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa index trước
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_customerCare_employeeId"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_customerCare_customerId"`
    );

    // Xóa constraints
    await queryRunner.query(`
      ALTER TABLE "customerCare" DROP CONSTRAINT IF EXISTS "FK_customerCare_employeeId"
    `);
    await queryRunner.query(`
      ALTER TABLE "customerCare" DROP CONSTRAINT IF EXISTS "FK_customerCare_customerId"
    `);

    // Xóa bảng
    await queryRunner.query(`DROP TABLE IF EXISTS "customerCare"`);

    // Bỏ location của misaCustomer
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" DROP COLUMN IF EXISTS "location"`
    );
  }
}
