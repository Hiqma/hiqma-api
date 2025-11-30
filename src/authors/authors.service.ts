import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Author } from '../database/entities';

@Injectable()
export class AuthorsService {
  constructor(
    @InjectRepository(Author)
    private authorRepository: Repository<Author>,
  ) {}

  async getAllAuthors() {
    return this.authorRepository.find({
      order: { name: 'ASC' },
    });
  }

  async createAuthor(authorData: Partial<Author>) {
    const author = this.authorRepository.create(authorData);
    return this.authorRepository.save(author);
  }

  async getAuthorById(id: string) {
    return this.authorRepository.findOne({ where: { id } });
  }

  async updateAuthor(id: string, authorData: Partial<Author>) {
    // First check if author exists
    const existingAuthor = await this.authorRepository.findOne({ where: { id } });
    if (!existingAuthor) {
      throw new Error('Author not found');
    }

    // Perform the update
    const updateResult = await this.authorRepository.update(id, authorData);
    
    // Check if update was successful
    if (updateResult.affected === 0) {
      throw new Error('Failed to update author');
    }

    // Return the updated author
    const updatedAuthor = await this.authorRepository.findOne({ where: { id } });
    if (!updatedAuthor) {
      throw new Error('Author not found after update');
    }

    return updatedAuthor;
  }

  async deleteAuthor(id: string) {
    const result = await this.authorRepository.delete(id);
    return { deleted: result.affected > 0 };
  }

  async searchAuthors(search?: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const whereCondition = search ? [
      { name: ILike(`%${search}%`) },
      { nationality: ILike(`%${search}%`) },
      { bio: ILike(`%${search}%`) }
    ] : {};

    const [authors, total] = await this.authorRepository.findAndCount({
      where: whereCondition,
      order: { name: 'ASC' },
      skip,
      take: limit,
    });

    return {
      data: authors,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getAuthorStats(id: string) {
    // In a real implementation, you would query related tables
    // For now, return mock data based on author info
    const author = await this.getAuthorById(id);
    if (!author) {
      throw new Error('Author not found');
    }

    // Mock stats - in real app, query content/books tables
    const yearsActive = author.birthYear ? new Date().getFullYear() - author.birthYear - 20 : 0;
    
    return {
      totalBooks: Math.floor(Math.random() * 20) + 1,
      publishedWorks: Math.floor(Math.random() * 15) + 1,
      yearsActive: Math.max(0, yearsActive)
    };
  }
}