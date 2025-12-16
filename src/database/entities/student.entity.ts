import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  hubId: string;

  @Column({ type: 'varchar', length: 8, unique: true })
  studentCode: string;

  // Encrypted fields for PII protection
  @Column({ type: 'text', nullable: true })
  firstNameEncrypted: string; // Encrypted firstName

  @Column({ type: 'text', nullable: true })
  lastNameEncrypted: string; // Encrypted lastName

  @Column({ type: 'varchar', length: 20, nullable: true })
  grade: string;

  @Column({ type: 'integer', nullable: true })
  age: number;

  @Column({ type: 'text', nullable: true })
  metadataEncrypted: string; // Encrypted JSON object for additional student information

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'active' | 'inactive';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual properties for decrypted data (not stored in database)
  firstName?: string;
  lastName?: string;
  metadata?: string;

  // Note: hubId references EdgeHub.hubId (string), not EdgeHub.id (number)
  // Relationship would need custom join condition, omitting for simplicity
}