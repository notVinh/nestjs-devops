import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDepartureNoteToArrivalReport1769000000000 implements MigrationInterface {
  name = 'AddDepartureNoteToArrivalReport1769000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "arrivalReport" ADD "departureNote" text`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "arrivalReport" DROP COLUMN "departureNote"`
    );
  }
}
