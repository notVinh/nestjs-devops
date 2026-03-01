import { EntityHelper } from 'src/utils/entity-helper';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { MisaOrder } from './misa-order.entity';

@Entity('misaOrderItem')
export class MisaOrderItem extends EntityHelper {
  @Column({ type: 'int' })
  misaOrderId: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  productCode?: string | null;

  @Column({ type: 'varchar', length: 500 })
  productName: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unit?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  unitPrice?: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  totalPrice?: number | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  photoUrls?: string[];

  // Relations
  @ManyToOne(() => MisaOrder, (order) => order.items, {
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'misaOrderId' })
  misaOrder?: MisaOrder;
}
