import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { EdgeHub } from './edge-hub.entity';
import { Content } from './content.entity';

@Entity('hub_content')
export class HubContent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  hubId: number;

  @Column({ type: 'uuid' })
  contentId: string;

  @CreateDateColumn()
  assignedAt: Date;

  @ManyToOne(() => EdgeHub)
  @JoinColumn({ name: 'hubId' })
  hub: EdgeHub;

  @ManyToOne(() => Content)
  @JoinColumn({ name: 'contentId' })
  content: Content;
}
