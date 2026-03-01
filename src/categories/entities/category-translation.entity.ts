import { EntityHelper } from 'src/utils/entity-helper';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Category } from './category.entity';

@Entity('categoryTranslations')
export class CategoryTranslation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  languageCode: string; // 'vi', 'en', 'zh'

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  slug: string;

  @Column()
  categoryId: number;

  @ManyToOne(() => Category, category => category.translations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;
}
