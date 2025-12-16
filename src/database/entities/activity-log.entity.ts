import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Device } from './device.entity';
import { Student } from './student.entity';

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
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

  @Column({ type: 'uuid', nullable: true })
  deviceId: string;

  @Column({ type: 'uuid', nullable: true })
  studentId: string;

  @CreateDateColumn()
  timestamp: Date;

  @ManyToOne(() => Device)
  @JoinColumn({ name: 'deviceId' })
  device: Device;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'studentId' })
  student: Student;
}