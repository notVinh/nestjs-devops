import { EntityHelper } from 'src/utils/entity-helper';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('notificationToken')
export class NotificationToken extends EntityHelper {
  @Column({ name: 'userId', type: 'bigint' })
  userId: number;

  @Column({ name: 'fcmToken', type: 'varchar', length: 255 })
  fcmToken: string;

  @Column({ type: 'smallint', default: 0 })
  status: number;
}
