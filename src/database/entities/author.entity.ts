import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { ContentAuthor } from './content-author.entity';

@Entity('authors')
export class Author {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nationality: string;

  @Column({ type: 'integer', nullable: true })
  birthYear: number;

  @Column({ type: 'boolean', default: false })
  isContributor: boolean;

  @Column({ type: 'uuid', nullable: true })
  contributorId: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'contributorId' })
  contributor: User;

  @OneToMany(() => ContentAuthor, contentAuthor => contentAuthor.author)
  contentAuthors: ContentAuthor[];
}