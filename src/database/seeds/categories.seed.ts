import { DataSource } from 'typeorm';
import { Category } from '../entities';

export async function seedCategories(dataSource: DataSource) {
  const categoryRepository = dataSource.getRepository(Category);
  
  const categories = [
    { name: 'Folktales', description: 'Traditional stories passed down through generations' },
    { name: 'Poetry', description: 'Poems and verses from African literature' },
    { name: 'Short Stories', description: 'Contemporary and traditional short stories' },
    { name: 'Historical Literature', description: 'Stories based on historical events and figures' },
    { name: 'Moral Tales', description: 'Stories with moral lessons and values' },
  ];

  let created = 0;
  for (const categoryData of categories) {
    const existing = await categoryRepository.findOne({ where: { name: categoryData.name } });
    if (!existing) {
      const category = categoryRepository.create(categoryData);
      await categoryRepository.save(category);
      created++;
    }
  }
  console.log(`Categories seeded: ${created} created, ${categories.length - created} already exist`);
}