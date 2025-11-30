import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('edge_hubs')
export class EdgeHub {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  hubId: string; // Special unique identifier for the hub

  @Column()
  name: string;

  @Column()
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column()
  encryptionKey: string; // Special encryption key for this hub

  @Column({ default: 'active' })
  status: string; // active, inactive, maintenance

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncAt: Date;
}