import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('productTranslations')
export class ProductTranslation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  languageCode: string; // 'vi', 'en', 'zh'

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text' })
  slug: string;

  // BỔ SUNG: Price đa ngôn ngữ (Vì bạn có 'Liên hệ', 'Contact')
  // @Column({ type: 'text', nullable: true })
  // price: string;

  // BỔ SUNG: Features (Lưu mảng các dòng tính năng)
  @Column({ type: 'jsonb', nullable: true })
  features: string[];

  // BỔ SUNG: Specs đa ngôn ngữ (Lưu mảng các Object {label, value})
  @Column({ type: 'jsonb', nullable: true })
  specs: { label: string; value: string }[];

  @ManyToOne(() => Product, product => product.translations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'productId' })
  product: Product;
}
