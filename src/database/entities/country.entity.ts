import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('countries')
export class Country {
  @PrimaryColumn({ type: 'varchar', length: 2 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  continent: string;
}