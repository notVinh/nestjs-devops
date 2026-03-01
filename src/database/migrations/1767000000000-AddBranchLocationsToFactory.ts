import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBranchLocationsToFactory1767000000000
  implements MigrationInterface
{
  name = 'AddBranchLocationsToFactory1767000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add branchLocations as JSON column (nullable)
    await queryRunner.query(
      `ALTER TABLE "factory" ADD "branchLocations" json`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "factory" DROP COLUMN "branchLocations"`
    );
  }
}

