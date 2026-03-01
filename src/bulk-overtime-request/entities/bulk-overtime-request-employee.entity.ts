import { EntityHelper } from 'src/utils/entity-helper';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BulkOvertimeRequest } from './bulk-overtime-request.entity';
import { Employee } from 'src/employee/entities/employee.entity';
import { Overtime } from 'src/overtime/entities/overtime.entity';

@Entity('bulkOvertimeRequestEmployee')
export class BulkOvertimeRequestEmployee extends EntityHelper {
  @Column({ type: 'bigint' })
  bulkOvertimeRequestId: number;

  @Column({ type: 'int' })
  employeeId: number;

  // ID của overtime đã tạo sau khi confirm (nếu có)
  @Column({ type: 'bigint', nullable: true })
  overtimeId?: number | null;

  // Relations
  @ManyToOne(() => BulkOvertimeRequest, (bulk) => bulk.employees, {
    eager: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'bulkOvertimeRequestId' })
  bulkOvertimeRequest?: BulkOvertimeRequest;

  @ManyToOne(() => Employee, { eager: false })
  @JoinColumn({ name: 'employeeId' })
  employee?: Employee;

  @ManyToOne(() => Overtime, { eager: false })
  @JoinColumn({ name: 'overtimeId' })
  overtime?: Overtime;
}
