import { Column, Entity, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { EntityHelper } from 'src/utils/entity-helper';
import { SupportRequest } from './support-request.entity';
import { SupportType } from 'src/support-type/entities/support-type.entity';

@Entity('supportRequestItem')
export class SupportRequestItem extends EntityHelper {
  @Column({ type: 'bigint' })
  supportRequestId: number;

  @Column({ type: 'bigint' })
  supportTypeId: number;

  // Số lượng (1 cho qua đêm, số km cho xe)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
  quantity: number;

  // Ảnh chứng minh (cho km xe)
  @Column({ type: 'jsonb', nullable: true })
  photoUrls?: string[] | null;

  // Ghi chú riêng cho item
  @Column({ type: 'varchar', length: 500, nullable: true })
  note?: string | null;

  // Relations
  @ManyToOne(() => SupportRequest, (request) => request.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'supportRequestId' })
  supportRequest: SupportRequest;

  @ManyToOne(() => SupportType, { eager: true })
  @JoinColumn({ name: 'supportTypeId' })
  supportType: SupportType;
}
