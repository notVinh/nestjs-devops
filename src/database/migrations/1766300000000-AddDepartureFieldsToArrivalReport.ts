import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDepartureFieldsToArrivalReport1766300000000 implements MigrationInterface {
  name = 'AddDepartureFieldsToArrivalReport1766300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "arrivalReport" ADD "departureTime" TIMESTAMP`
    );
    await queryRunner.query(
      `ALTER TABLE "arrivalReport" ADD "departureLocation" point`
    );
    await queryRunner.query(
      `ALTER TABLE "arrivalReport" ADD "departurePhotoUrls" jsonb`
    );
    await queryRunner.query(
      `ALTER TABLE "arrivalReport" ADD "stayDurationMinutes" integer`
    );
    await queryRunner.query(
      `ALTER TABLE "arrivalReport" ADD "distanceMeters" numeric(10,2)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "arrivalReport" DROP COLUMN "distanceMeters"`
    );
    await queryRunner.query(
      `ALTER TABLE "arrivalReport" DROP COLUMN "stayDurationMinutes"`
    );
    await queryRunner.query(
      `ALTER TABLE "arrivalReport" DROP COLUMN "departurePhotoUrls"`
    );
    await queryRunner.query(
      `ALTER TABLE "arrivalReport" DROP COLUMN "departureLocation"`
    );
    await queryRunner.query(
      `ALTER TABLE "arrivalReport" DROP COLUMN "departureTime"`
    );
  }
}

