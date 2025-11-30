import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Content } from './content.entity';
import { Category } from './category.entity';

@Entity('content_categories')
export class ContentCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  contentId: string;

  @Column()
  categoryId: string;

  @ManyToOne(() => Content, content => content.contentCategories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contentId' })
  content: Content;

  @ManyToOne(() => Category, category => category.contentCategories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;
}