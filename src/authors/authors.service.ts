import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Author, Content, ContentAuthor } from '../database/entities';

@Injectable()
export class AuthorsService {
  constructor(
    @InjectRepository(Author)
    private authorRepository: Repository<Author>,
    @InjectRepository(Content)
    private contentRepository: Repository<Content>,
    @InjectRepository(ContentAuthor)
    private contentAuthorRepository: Repository<ContentAuthor>,
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
    // Get author
    const author = await this.getAuthorById(id);
    if (!author) {
      throw new Error('Author not found');
    }

    // Get content IDs for this author through the join table
    const contentAuthors = await this.contentAuthorRepository.find({
      where: { authorId: id },
      select: ['contentId']
    });

    const contentIds = contentAuthors.map(ca => ca.contentId);

    if (contentIds.length === 0) {
      return {
        totalContent: 0,
        publishedContent: 0,
        draftContent: 0,
        yearsActive: author.birthYear ? Math.max(0, new Date().getFullYear() - author.birthYear - 20) : 0
      };
    }

    // Get content stats
    const [allContent, publishedContent] = await Promise.all([
      this.contentRepository.count({ 
        where: contentIds.map(id => ({ id }))
      }),
      this.contentRepository.count({ 
        where: contentIds.map(id => ({ id, status: 'verified' as const }))
      })
    ]);

    // Calculate years active
    const yearsActive = author.birthYear ? new Date().getFullYear() - author.birthYear - 20 : 0;
    
    return {
      totalContent: allContent,
      publishedContent: publishedContent,
      draftContent: allContent - publishedContent,
      yearsActive: Math.max(0, yearsActive)
    };
  }

  async getAuthorContent(id: string) {
    // Verify author exists
    const author = await this.getAuthorById(id);
    if (!author) {
      throw new Error('Author not found');
    }

    // Get content IDs for this author through the join table
    const contentAuthors = await this.contentAuthorRepository.find({
      where: { authorId: id },
      select: ['contentId']
    });

    const contentIds = contentAuthors.map(ca => ca.contentId);

    if (contentIds.length === 0) {
      return [];
    }

    // Get all content by this author with related data
    const content = await this.contentRepository
      .createQueryBuilder('content')
      .leftJoinAndSelect('content.ageGroup', 'ageGroup')
      .leftJoinAndSelect('content.contentCategories', 'contentCategories')
      .leftJoinAndSelect('contentCategories.category', 'category')
      .whereInIds(contentIds)
      .orderBy('content.createdAt', 'DESC')
      .getMany();

    // Transform to include category directly for easier access
    return content.map(c => ({
      ...c,
      category: c.contentCategories?.[0]?.category || null
    }));
  }
}