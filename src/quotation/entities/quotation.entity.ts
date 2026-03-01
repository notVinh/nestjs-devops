import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { QuotationItem } from './quotation-item.entity';
import { EntityHelper } from 'src/utils/entity-helper';

@Entity('quotations')
export class Quotation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  customerName: string;

  @Column()
  customerEmail: string;

  @Column()
  customerPhone: string;

  @Column({ type: 'varchar', nullable: true })
  confirmationToken?: string | null;

  @Column({ type: 'text', nullable: true })
  customerAddress?: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ default: 'pending' })
  status: string; // pending, processing, sent, rejected

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalPrice: number;

  @OneToMany(() => QuotationItem, item => item.quotation, { cascade: true })
  items: QuotationItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
