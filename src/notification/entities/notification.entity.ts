import { EntityHelper } from 'src/utils/entity-helper';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('notification')
export class Notification extends EntityHelper {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 255 })
  body: string;

  @Column({ name: 'notificationTokenIds', type: 'bigint', array: true })
  notificationTokenIds: number[];

  @Column({ name: 'statusCd', type: 'smallint', default: 0 })
  statusCd: number;

  @Column({ name: 'userId', type: 'bigint' })
  userId: number;

  // Loại notification để xác định điều hướng
  // vd: 'leave_request_created', 'leave_request_approved', 'leave_request_rejected'
  @Column({ type: 'varchar', length: 100, nullable: true })
  type?: string;

  // ID của resource liên quan (vd: leave request ID)
  @Column({ type: 'bigint', nullable: true })
  referenceId?: number;

  // Metadata bổ sung (JSON) để lưu thông tin thêm nếu cần
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}
