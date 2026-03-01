import { MigrationInterface, QueryRunner } from "typeorm"

export class AddIndexesForMisaOrderPerformance1763700000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Index cho misaOrder table

        // 1. Index cho currentStep (filter theo bước hiện tại)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_misaOrder_currentStep"
            ON "misaOrder" ("currentStep")
            WHERE "deletedAt" IS NULL
        `);

        // 2. Composite index cho (factoryId, currentStep) - cho người có quyền xem tất cả
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_misaOrder_factoryId_currentStep"
            ON "misaOrder" ("factoryId", "currentStep")
            WHERE "deletedAt" IS NULL
        `);

        // 3. Index cho orderDate (filter theo ngày)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_misaOrder_orderDate"
            ON "misaOrder" ("orderDate")
            WHERE "deletedAt" IS NULL
        `);

        // 4. Index cho status (filter theo trạng thái)
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_misaOrder_status"
            ON "misaOrder" ("status")
            WHERE "deletedAt" IS NULL
        `);

        // 5. Composite index cho (factoryId, orderDate, status) - query phức hợp
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_misaOrder_factoryId_orderDate_status"
            ON "misaOrder" ("factoryId", "orderDate" DESC, "status")
            WHERE "deletedAt" IS NULL
        `);

        // Index cho orderAssignment table

        // 6. Composite index cho (orderId, employeeId) - check assignment
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_orderAssignment_orderId_employeeId"
            ON "orderAssignment" ("orderId", "employeeId")
            WHERE "deletedAt" IS NULL
        `);

        // 7. Composite index cho (employeeId, orderId) - reverse order cho query từ employee
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_orderAssignment_employeeId_orderId"
            ON "orderAssignment" ("employeeId", "orderId")
            WHERE "deletedAt" IS NULL
        `);

        // 8. Composite index cho (orderId, employeeId, step) - filter theo step
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_orderAssignment_orderId_employeeId_step"
            ON "orderAssignment" ("orderId", "employeeId", "step")
            WHERE "deletedAt" IS NULL
        `);

        // 9. Index cho step alone - useful cho reporting
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_orderAssignment_step"
            ON "orderAssignment" ("step")
            WHERE "deletedAt" IS NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop all indexes in reverse order
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orderAssignment_step"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orderAssignment_orderId_employeeId_step"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orderAssignment_employeeId_orderId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orderAssignment_orderId_employeeId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_misaOrder_factoryId_orderDate_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_misaOrder_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_misaOrder_orderDate"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_misaOrder_factoryId_currentStep"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_misaOrder_currentStep"`);
    }

}
