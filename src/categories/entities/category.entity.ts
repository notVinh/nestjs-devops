import { Product } from 'src/products/entities/product.entity';
import { EntityHelper } from 'src/utils/entity-helper';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CategoryTranslation } from './category-translation.entity';

@Entity('categories')
export class Category extends EntityHelper {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  parentId: number | null;

  @Column({ default: 1 })
  level: number;

  @Column({ nullable: true })
  image: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  // Quan hệ với bảng dịch (Đa ngôn ngữ)
  @OneToMany(() => CategoryTranslation, translation => translation.category)
  translations: CategoryTranslation[];

  // Quan hệ cha-con nội bộ
  @ManyToOne(() => Category, category => category.children, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentId' })
  parent: Category;

  @OneToMany(() => Category, category => category.parent)
  children: Category[];

  @OneToMany(() => Product, product => product.category)
  products: Product[];
}
