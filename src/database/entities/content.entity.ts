import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Author } from './author.entity';
import { Category } from './category.entity';
import { AgeGroup } from './age-group.entity';
import { ContentAuthor } from './content-author.entity';
import { ContentCategory } from './content-category.entity';

@Entity('content')
export class Content {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text' })
  htmlContent: string;

  @Column({ type: 'varchar', length: 10 })
  originalLanguage: string;

  @Column({ type: 'text' })
  targetCountries: string; // JSON array of country codes

  @Column({ type: 'uuid' })
  ageGroupId: string;

  @Column({ type: 'text', nullable: true })
  comprehensionQuestions: string; // JSON array

  @Column({ type: 'text', nullable: true })
  images: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'verified' | 'rejected';

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ type: 'uuid' })
  contributorId: string;

  @Column({ type: 'uuid', nullable: true })
  hubVerificationId: string;

  @Column({ type: 'varchar', length: 50 })
  language: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'contributorId' })
  contributor: User;



  @ManyToOne(() => AgeGroup)
  @JoinColumn({ name: 'ageGroupId' })
  ageGroup: AgeGroup;

  @OneToMany(() => ContentAuthor, contentAuthor => contentAuthor.content)
  contentAuthors: ContentAuthor[];

  @OneToMany(() => ContentCategory, contentCategory => contentCategory.content)
  contentCategories: ContentCategory[];
}