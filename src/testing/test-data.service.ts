import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Content, Author, Country } from '../database/entities';

@Injectable()
export class TestDataService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Content) private contentRepository: Repository<Content>,
    @InjectRepository(Author) private authorRepository: Repository<Author>,
    @InjectRepository(Country) private countryRepository: Repository<Country>,
  ) {}

  async seedTestData() {
    const kenya = await this.countryRepository.save({
      code: 'KE',
      name: 'Kenya',
      continent: 'Africa',
    });

    const admin = await this.userRepository.save({
      email: 'admin@aelh.test',
      password: 'hashedpassword',
      role: 'super_admin',
      name: 'Test Admin',
      country: 'Kenya',
      continent: 'Africa',
    });

    const author = await this.authorRepository.save({
      name: 'Test Author',
      bio: 'Educational content creator',
      nationality: 'Kenyan',
      birthYear: 1980,
      isContributor: true,
      contributorId: admin.id,
    });

    // Note: This will need actual category and age group IDs from seeded data
    // For now, we'll skip content creation in test data
    // await this.contentRepository.save({
    //   title: 'Sample Mathematics Lesson',
    //   htmlContent: '<h1>Basic Addition</h1><p>Learn to add numbers...</p>',
    //   categoryId: 'category-id-here',
    //   ageGroupId: 'age-group-id-here',
    //   language: 'English',
    //   originalLanguage: 'English',
    //   authorId: author.id,
    //   contributorId: admin.id,
    //   targetCountries: JSON.stringify(['KE']),
    //   comprehensionQuestions: JSON.stringify([
    //     {
    //       id: '1',
    //       type: 'multiple_choice',
    //       question: 'What is 2 + 2?',
    //       options: ['3', '4', '5', '6'],
    //       correctAnswer: '4',
    //       difficulty: 'easy',
    //       points: 10,
    //     },
    //   ]),
    //   status: 'verified',
    // });

    return { message: 'Test data seeded successfully' };
  }

  async clearTestData() {
    await this.contentRepository.delete({});
    await this.authorRepository.delete({});
    await this.userRepository.delete({});
    await this.countryRepository.delete({});
    
    return { message: 'Test data cleared successfully' };
  }
}