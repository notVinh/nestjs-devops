import { EntityHelper } from 'src/utils/entity-helper';
import { Column, Entity, ManyToOne, JoinColumn, ManyToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PositionEmployee } from '../../position-employee/entities/position-employee.entity';
import { Department } from '../../deparments/entities/deparment.entity';
import { Team } from '../../team/entities/team.entity';
import { RoleGroup } from '../../role-group/entities/role-group.entity';

@Entity()
export class Employee extends EntityHelper {
  @Column({ type: 'bigint' })
  factoryId: number;

  @Column({ type: 'bigint' })
  userId: number;

  @Column({ type: String, nullable: true })
  employeeCode: string | null; // Mã nhân viên

  @Column({ type: String, nullable: true })
  gender: string | null; // Giới tính: Nam, Nữ, Khác

  @Column({ type: 'bigint' })
  positionId: number;

  @Column({ type: 'bigint' })
  departmentId: number;

  @Column({ type: 'bigint', nullable: true })
  teamId: number | null;

  @Column({ type: Number })
  salary: number;

  @Column({ type: String })
  status: string;

  @Column({ type: String, default: 'daily' })
  salaryType: 'daily' | 'production';

  @Column({ type: Date })
  startDateJob: Date;

  @Column({ type: Date, nullable: true })
  endDateJob: Date | null;

  @Column({ type: 'boolean', default: false })
  isManager: boolean;

  // Factory-level admin access controls (scoped to this employee only)
  @Column({ type: 'boolean', default: false })
  canAccessAdmin: boolean;

  @Column({ type: 'text', array: true, nullable: true, default: '{}' })
  adminMenuKeys: string[] | null;

  // Attendance configuration fields
  @Column({ type: 'json', nullable: true, default: '["location"]' })
  allowedAttendanceMethods: string[] | null; // ['location', 'remote', 'photo', 'fingerprint']

  @Column({ type: 'boolean', default: true })
  requireLocationCheck: boolean; // Require location verification

  @Column({ type: 'boolean', default: false })
  requirePhotoVerification: boolean; // Require photo verification

  @Column({ type: 'boolean', default: false })
  requireFingerprintVerification: boolean; // Require fingerprint verification

  @Column({ type: 'boolean', default: false })
  allowRemoteAttendance: boolean; // Allow attendance without location check

  // Leave management
  @Column({ type: 'decimal', precision: 5, scale: 1, default: 0 })
  totalLeaveDays: number; // Tổng số ngày phép trong năm

  @Column({ type: 'decimal', precision: 5, scale: 1, default: 0 })
  usedLeaveDays: number; // Số ngày phép đã sử dụng

  @Column({ type: 'decimal', precision: 5, scale: 1, default: 0 })
  availableLeaveDays: number; // Số ngày phép còn lại

  @Column({ type: 'decimal', precision: 5, scale: 1, default: 0 })
  expiringLeaveDays: number; // Số ngày phép sắp hết hạn

  // Custom working hours for employee (overrides factory hours if set)
  @Column({ type: 'time', precision: 0, nullable: true })
  hourStartWork: string | null; // Giờ bắt đầu làm việc riêng của nhân viên (HH:mm:ss)

  @Column({ type: 'time', precision: 0, nullable: true })
  hourEndWork: string | null; // Giờ kết thúc làm việc riêng của nhân viên (HH:mm:ss)

  // Permissions for MISA orders and other features
  // Example permissions: 'receive_order_creation_notification', 'approve_orders', etc.
  @Column({ type: 'text', array: true, nullable: true, default: '{}' })
  permissions: string[] | null;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => PositionEmployee, position => position.employees)
  @JoinColumn({ name: 'positionId' })
  position: PositionEmployee;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'departmentId' })
  department: Department;

  @ManyToOne(() => Team, team => team.employees)
  @JoinColumn({ name: 'teamId' })
  team: Team;

  // Role Groups relation (Many-to-Many)
  @ManyToMany(() => RoleGroup, roleGroup => roleGroup.employees)
  roleGroups: RoleGroup[];
}
