import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddArrivalPhotoUrlColumn1763693300000 implements MigrationInterface {
  name = 'AddArrivalPhotoUrlColumn1763693300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query( 
      `ALTER TABLE "arrivalReport" ADD "photoUrls" jsonb NULL`,
    );
    await queryRunner.query( 
      `ALTER TABLE "attendance" ADD "photoUrls" jsonb NULL`,
    );
    await queryRunner.query( 
      `ALTER TABLE "orderAssignment" ADD "photoUrls" jsonb NULL`,
    );
    await queryRunner.query( 
      `ALTER TABLE "misaOrder" ADD "photoUrls" jsonb NULL`,
    );
    await queryRunner.query( 
      `ALTER TABLE "misaOrderItem" ADD "photoUrls" jsonb NULL`,
    );
    await queryRunner.query( 
      `ALTER TABLE "maintenanceReport" ADD "photoUrls" jsonb NULL`,
    );
    await queryRunner.query( 
      `ALTER TABLE "employeeFeedback" ADD "photoUrls" jsonb NULL`,
    );
    await queryRunner.query( 
      `ALTER TABLE "leaveRequest" ADD "photoUrls" jsonb NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "arrivalReport" DROP COLUMN "photoUrls"`);
    await queryRunner.query(`ALTER TABLE "attendance" DROP COLUMN "photoUrls"`);
    await queryRunner.query(`ALTER TABLE "orderAssignment" DROP COLUMN "photoUrls"`);
    await queryRunner.query(`ALTER TABLE "misaOrder" DROP COLUMN "photoUrls"`);
    await queryRunner.query(`ALTER TABLE "misaOrderItem" DROP COLUMN "photoUrls"`);
    await queryRunner.query(`ALTER TABLE "maintenanceReport" DROP COLUMN "photoUrls"`);
    await queryRunner.query(`ALTER TABLE "employeeFeedback" DROP COLUMN "photoUrls"`);
    await queryRunner.query(`ALTER TABLE "leaveRequest" DROP COLUMN "photoUrls"`);
  }
}
