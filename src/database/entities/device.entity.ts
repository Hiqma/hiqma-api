import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  hubId: string;

  @Column({ type: 'varchar', length: 8, unique: true })
  deviceCode: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'active' | 'inactive' | 'pending';

  @Column({ type: 'timestamp', nullable: true })
  registeredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastSeen: Date;

  @Column({ type: 'text', nullable: true })
  deviceInfo: string; // JSON object containing device metadata

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Note: hubId references EdgeHub.hubId (string), not EdgeHub.id (number)
  // Relationship would need custom join condition, omitting for simplicity
}