// products/entities/product.entity.ts
import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Category } from 'src/categories/entities/category.entity';
import { ProductTranslation } from './product-translation.entity';

@Entity('products')
export class Product {
  @PrimaryColumn({ length: 50 })
  id: string; // Đây là Mã máy (Machine Code)

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  price: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  originalPrice: number;

  @Column({ nullable: true })
  brand: string;

  @Column({ type: 'jsonb', nullable: true })
  specs: any;

  @Column({ type: 'jsonb', nullable: true })
  images: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Category, category => category.products, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  // Quan hệ với bảng dịch - Quan trọng để lưu đa ngôn ngữ
  @OneToMany(() => ProductTranslation, translation => translation.product, {
    cascade: true,
  })
  translations: ProductTranslation[];
}
