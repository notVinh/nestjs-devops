import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddOrderReceivedConfirmationFields1765000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add orderReceivedConfirmedByEmployeeId column
    await queryRunner.query(
      `ALTER TABLE "misaOrder" ADD COLUMN "orderReceivedConfirmedByEmployeeId" INTEGER;`,
    );

    // Add orderReceivedConfirmedAt column
    await queryRunner.query(
      `ALTER TABLE "misaOrder" ADD COLUMN "orderReceivedConfirmedAt" TIMESTAMP;`,
    );

    // Add foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "misaOrder" ADD CONSTRAINT "FK_misaOrder_orderReceivedConfirmedBy" FOREIGN KEY ("orderReceivedConfirmedByEmployeeId") REFERENCES "employee"("id") ON DELETE SET NULL;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.query(
      `ALTER TABLE "misaOrder" DROP CONSTRAINT "FK_misaOrder_orderReceivedConfirmedBy";`,
    );

    // Drop columns
    await queryRunner.query(
      `ALTER TABLE "misaOrder" DROP COLUMN "orderReceivedConfirmedAt";`,
    );
    await queryRunner.query(
      `ALTER TABLE "misaOrder" DROP COLUMN "orderReceivedConfirmedByEmployeeId";`,
    );
  }
}
