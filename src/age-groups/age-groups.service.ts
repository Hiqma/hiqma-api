import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AgeGroup } from '../database/entities';
import { seedAgeGroups } from '../database/seeds/age-groups.seed';

@Injectable()
export class AgeGroupsService {
  constructor(
    @InjectRepository(AgeGroup)
    private ageGroupRepository: Repository<AgeGroup>,
    private dataSource: DataSource,
  ) {}

  async getAllAgeGroups() {
    return this.ageGroupRepository.find({
      where: { isActive: true },
      order: { minAge: 'ASC' },
    });
  }

  async createAgeGroup(ageGroupData: Partial<AgeGroup>) {
    const ageGroup = this.ageGroupRepository.create(ageGroupData);
    return this.ageGroupRepository.save(ageGroup);
  }

  async seedAgeGroups() {
    await seedAgeGroups(this.dataSource);
    return { message: 'Age groups seeded successfully' };
  }
}