import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerExtra1776303285029 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    /**
     * NHÓM 1: CHĂM SÓC KHÁCH HÀNG (CUSTOMER CARE)
     */
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "careIntervalDays" integer NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "careById" bigint NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "lastCaredAt" TIMESTAMP WITH TIME ZONE NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "nextCareAt" TIMESTAMP WITH TIME ZONE NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "careNote" text NULL`
    );

    // Index & FK cho người chăm sóc
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_misaCustomer_careById" ON "misaCustomer" ("careById")`
    );
    await queryRunner.query(`
      ALTER TABLE "misaCustomer" 
      ADD CONSTRAINT "FK_misaCustomer_careById" 
      FOREIGN KEY ("careById") REFERENCES "employee"("id") 
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    /**
     * NHÓM 2: CHÍNH SÁCH BÁN HÀNG & MARKETING (SALES & MARKETING)
     */
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "customerGroup" varchar(100) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "priceGroup" varchar(100) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "discountRate" numeric(5,2) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "minOrderValue" numeric(18,2) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "salesRegion" varchar(100) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "acquisitionSource" varchar(255) NULL`
    );

    /**
     * NHÓM 3: CÔNG NỢ, THANH TOÁN & RỦI RO (DEBT, PAYMENT & RISK)
     */
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "creditLimit" numeric(18,2) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "paymentTermDays" int NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "currentDebt" numeric(18,2) NOT NULL DEFAULT 0`
    );
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "overdueDebt" numeric(18,2) NOT NULL DEFAULT 0`
    );
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "lastPaymentDate" TIMESTAMP WITH TIME ZONE NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "lastPaymentAmount" numeric(18,2) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "debtUpdatedAt" TIMESTAMP WITH TIME ZONE NULL`
    );

    // Các trường kiểm soát rủi ro bổ sung
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "isBlockedDebt" boolean NOT NULL DEFAULT false`
    );
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "debtGraceDays" int NULL DEFAULT 0`
    );
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "isInvoiced" boolean NOT NULL DEFAULT false`
    );

    // Thông tin ngân hàng
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "paymentMethod" varchar(100) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "bankName" varchar(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "bankAccountNumber" varchar(100) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "bankBranch" varchar(255) NULL`
    );

    /**
     * NHÓM 4: LOGISTICS & PHÁP LÝ (LOGISTICS & LEGAL)
     */
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "shippingAddress" text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "contractFiles" jsonb NULL`
    );

    /**
     * NHÓM 5: ĐẶC THÙ SẢN XUẤT MAY MẶC (MANUFACTURING SPECIFIC)
     */
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "garmentType" varchar(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "currentEquipment" text NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "investmentPotential" varchar(255) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "workerScale" integer NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "averageMonthlyCapacity" int NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" ADD COLUMN IF NOT EXISTS "qualityStandard" varchar(100) NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Xóa Constraint & Index trước
    await queryRunner.query(
      `ALTER TABLE "misaCustomer" DROP CONSTRAINT IF EXISTS "FK_misaCustomer_careById"`
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_misaCustomer_careById"`);

    // Danh sách tất cả các cột để xóa
    const columns = [
      'careIntervalDays',
      'careById',
      'lastCaredAt',
      'nextCareAt',
      'careNote',
      'customerGroup',
      'priceGroup',
      'discountRate',
      'minOrderValue',
      'salesRegion',
      'acquisitionSource',
      'creditLimit',
      'paymentTermDays',
      'currentDebt',
      'overdueDebt',
      'lastPaymentDate',
      'lastPaymentAmount',
      'debtUpdatedAt',
      'isBlockedDebt',
      'debtGraceDays',
      'isInvoiced',
      'paymentMethod',
      'bankName',
      'bankAccountNumber',
      'bankBranch',
      'shippingAddress',
      'contractFiles',
      'garmentType',
      'currentEquipment',
      'investmentPotential',
      'workerScale',
      'averageMonthlyCapacity',
      'qualityStandard',
    ];

    for (const column of columns) {
      await queryRunner.query(
        `ALTER TABLE "misaCustomer" DROP COLUMN IF EXISTS "${column}"`
      );
    }
  }
}
