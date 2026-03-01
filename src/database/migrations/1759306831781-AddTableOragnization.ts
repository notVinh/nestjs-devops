import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTableOragnization1759306831781 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "factory" (
        "id" SERIAL NOT NULL,
        "name" CHARACTER VARYING NOT NULL,
        "phone" CHARACTER VARYING,
        "address" CHARACTER VARYING,
        "location" POINT,
        "maxEmployees" INTEGER,
        "hourStartWork" TIME NOT NULL,
        "hourEndWork" TIME NOT NULL,
        "isGTG" BOOLEAN NOT NULL DEFAULT FALSE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_factory" PRIMARY KEY ("id")
      )`
    );
    await queryRunner.query(
      `CREATE TABLE employee (
        "id" SERIAL NOT NULL,
        "factoryId" INTEGER NOT NULL,
        "userId" INTEGER NOT NULL,
        "positionId" INTEGER,
        "salary" DECIMAL(10,2),
        "status" CHARACTER VARYING,
        "startDateJob" TIMESTAMP NOT NULL,
        "endDateJob" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_employee" PRIMARY KEY ("id")
      )`
    );
    await queryRunner.query(
      `CREATE TABLE attendance (
        id SERIAL NOT NULL,
        "factoryId" INTEGER NOT NULL,
        "employeeId" INTEGER NOT NULL,
        "attendanceDate" TIMESTAMP NOT NULL,

        "checkInTime" TIMESTAMP,
        "checkInLocation" POINT,
        "checkInAddress" CHARACTER VARYING,
        "checkInPhotoUrl" CHARACTER VARYING,
        "checkInDeviceInfo" JSONB,
        "checkInMethod" CHARACTER VARYING(20),

        "checkOutTime" TIMESTAMP,
        "checkOutLocation" POINT,
        "checkOutAddress" CHARACTER VARYING,
        "checkOutPhotoUrl" CHARACTER VARYING,
        "checkOutDeviceInfo" JSONB,
        "checkOutMethod" CHARACTER VARYING(20),

        "workHours" DECIMAL(4,2),
        "overtimeHours" DECIMAL(4,2),

        "status" CHARACTER VARYING(20) DEFAULT 'present' CHECK (status IN (
            'present', 'late', 'earlyLeave', 'absent',
            'onLeave', 'businessTrip', 'remote'
        )),

        "isLate" BOOLEAN,
        "lateMinutes" INTEGER,

        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,

        CONSTRAINT "PK_attendance" PRIMARY KEY ("id")
      )`
    );
    await queryRunner.query(
      `CREATE TABLE "positionEmployee" (
        "id" SERIAL NOT NULL,
        "name" CHARACTER VARYING NOT NULL,
        "description" CHARACTER VARYING,
        "factoryId" INTEGER NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_positionEmployee" PRIMARY KEY ("id")
      )`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "attendance"`);
    await queryRunner.query(`DROP TABLE "employee"`);
    await queryRunner.query(`DROP TABLE "factory"`);
    await queryRunner.query(`DROP TABLE "positionEmployee"`);
  }
}
