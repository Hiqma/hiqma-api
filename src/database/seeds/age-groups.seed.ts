import { DataSource } from 'typeorm';
import { AgeGroup } from '../entities';

export async function seedAgeGroups(dataSource: DataSource) {
  const ageGroupRepository = dataSource.getRepository(AgeGroup);
  
  const ageGroups = [
    { name: '5-8 years', minAge: 5, maxAge: 8, description: 'Early elementary school age' },
    { name: '9-12 years', minAge: 9, maxAge: 12, description: 'Late elementary school age' },
    { name: '13-16 years', minAge: 13, maxAge: 16, description: 'Middle and high school age' },
    { name: '17+ years', minAge: 17, maxAge: 99, description: 'Young adults and above' },
  ];

  let created = 0;
  for (const ageGroupData of ageGroups) {
    const existing = await ageGroupRepository.findOne({ where: { name: ageGroupData.name } });
    if (!existing) {
      const ageGroup = ageGroupRepository.create(ageGroupData);
      await ageGroupRepository.save(ageGroup);
      created++;
    }
  }
  console.log(`Age groups seeded: ${created} created, ${ageGroups.length - created} already exist`);
}