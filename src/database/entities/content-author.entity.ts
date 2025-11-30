import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Content } from './content.entity';
import { Author } from './author.entity';

@Entity('content_authors')
export class ContentAuthor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  contentId: string;

  @Column()
  authorId: string;

  @ManyToOne(() => Content, content => content.contentAuthors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contentId' })
  content: Content;

  @ManyToOne(() => Author, author => author.contentAuthors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author: Author;
}