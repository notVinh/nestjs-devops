import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttendanceConfigToEmployee1761108000000
  implements MigrationInterface
{
  name = 'AddAttendanceConfigToEmployee1761108000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add allowedAttendanceMethods as JSON column
    await queryRunner.query(
      `ALTER TABLE "employee" ADD "allowedAttendanceMethods" json DEFAULT '["location"]'`
    );

    // Add requireLocationCheck - default true (must check location)
    await queryRunner.query(
      `ALTER TABLE "employee" ADD "requireLocationCheck" BOOLEAN NOT NULL DEFAULT TRUE`
    );

    // Add requirePhotoVerification - default false
    await queryRunner.query(
      `ALTER TABLE "employee" ADD "requirePhotoVerification" BOOLEAN NOT NULL DEFAULT FALSE`
    );

    // Add requireFingerprintVerification - default false
    await queryRunner.query(
      `ALTER TABLE "employee" ADD "requireFingerprintVerification" BOOLEAN NOT NULL DEFAULT FALSE`
    );

    // Add allowRemoteAttendance - default false (when true, skip location check)
    await queryRunner.query(
      `ALTER TABLE "employee" ADD "allowRemoteAttendance" BOOLEAN NOT NULL DEFAULT FALSE`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "employee" DROP COLUMN "allowRemoteAttendance"`
    );
    await queryRunner.query(
      `ALTER TABLE "employee" DROP COLUMN "requireFingerprintVerification"`
    );
    await queryRunner.query(
      `ALTER TABLE "employee" DROP COLUMN "requirePhotoVerification"`
    );
    await queryRunner.query(
      `ALTER TABLE "employee" DROP COLUMN "requireLocationCheck"`
    );
    await queryRunner.query(
      `ALTER TABLE "employee" DROP COLUMN "allowedAttendanceMethods"`
    );
  }
}
