import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  hubId: string;

  @Column({ type: 'varchar', length: 255 })
  sessionId: string;

  @Column({ type: 'uuid' })
  contentId: string;

  @Column({ type: 'integer' })
  timeSpent: number;

  @Column({ type: 'integer', nullable: true })
  quizScore: number;

  @Column({ type: 'boolean', default: false })
  moduleCompleted: boolean;

  @CreateDateColumn()
  timestamp: Date;
}