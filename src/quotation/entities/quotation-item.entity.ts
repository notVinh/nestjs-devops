import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Quotation } from './quotation.entity';
import { Product } from 'src/products/entities/product.entity';

@Entity('quotationItems')
export class QuotationItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'quotationId' })
  quotationId: number;

  @Column({ name: 'productId', type: 'varchar', length: 255 }) // Đổi từ bigint sang varchar
  productId: string; // Đổi kiểu dữ liệu ở đây thành string

  @Column({ default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  unitPrice: number;

  // Liên kết với bảng Quotation
  @ManyToOne(() => Quotation, quotation => quotation.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'quotationId' })
  quotation: Quotation;

  // Liên kết với bảng Products
  @ManyToOne(() => Product)
  @JoinColumn({ name: 'productId' })
  product: Product;
}
