import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Content, Author, ContentAuthor, ContentCategory, Category, AgeGroup } from '../database/entities';
import { QuestionValidationService } from './question-validation.service';
import { ContentSanitizerService } from '../security/content-sanitizer.service';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(Content)
    private contentRepository: Repository<Content>,
    @InjectRepository(Author)
    private authorRepository: Repository<Author>,
    @InjectRepository(ContentAuthor)
    private contentAuthorRepository: Repository<ContentAuthor>,
    @InjectRepository(ContentCategory)
    private contentCategoryRepository: Repository<ContentCategory>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(AgeGroup)
    private ageGroupRepository: Repository<AgeGroup>,
    private questionValidationService: QuestionValidationService,
    private contentSanitizerService: ContentSanitizerService,
  ) {}

  async getPendingContent(search?: string, page: number = 1, limit: number = 10) {
    const queryBuilder = this.contentRepository.createQueryBuilder('content')
      .leftJoinAndSelect('content.ageGroup', 'ageGroup')
      .where('content.status = :status', { status: 'pending' });

    if (search) {
      queryBuilder.andWhere(
        '(content.title ILIKE :search OR content.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const total = await queryBuilder.getCount();
    const data = await queryBuilder
      .orderBy('content.createdAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async submitContent(contentData: any) {
    // Validate categories exist
    if (contentData.categoryId && Array.isArray(contentData.categoryId)) {
      for (const categoryId of contentData.categoryId) {
        const category = await this.categoryRepository.findOne({ where: { id: categoryId } });
        if (!category) {
          throw new BadRequestException(`Invalid category: ${categoryId}`);
        }
      }
    }

    // Validate age group exists
    if (contentData.ageGroupId) {
      const ageGroup = await this.ageGroupRepository.findOne({ where: { id: contentData.ageGroupId } });
      if (!ageGroup) {
        throw new BadRequestException(`Invalid age group: ${contentData.ageGroupId}`);
      }
    }

    // Validate authors exist
    if (contentData.authorId && Array.isArray(contentData.authorId)) {
      for (const authorId of contentData.authorId) {
        const author = await this.authorRepository.findOne({ where: { id: authorId } });
        if (!author) {
          throw new BadRequestException(`Invalid author: ${authorId}`);
        }
      }
    }

    // Handle author creation/selection for contributors
    if (contentData.isAuthor && contentData.contributorId) {
      let author = await this.authorRepository.findOne({
        where: { contributorId: contentData.contributorId }
      });
      
      if (!author) {
        author = this.authorRepository.create({
          name: contentData.authorName || 'Unknown Author',
          isContributor: true,
          contributorId: contentData.contributorId
        });
        author = await this.authorRepository.save(author);
      }
      
      if (!contentData.authorId || !Array.isArray(contentData.authorId)) {
        contentData.authorId = [];
      }
      if (!contentData.authorId.includes(author.id)) {
        contentData.authorId.push(author.id);
      }
    }

    // Validate metadata
    const validation = this.contentSanitizerService.validateContentMetadata(contentData);
    if (!validation.isValid) {
      throw new BadRequestException(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Sanitize HTML content
    if (contentData.htmlContent) {
      contentData.htmlContent = this.contentSanitizerService.sanitizeHtmlContent(contentData.htmlContent);
    }

    // Validate and sanitize questions (optional)
    if (contentData.comprehensionQuestions) {
      let questions;
      try {
        questions = typeof contentData.comprehensionQuestions === 'string' 
          ? JSON.parse(contentData.comprehensionQuestions) 
          : contentData.comprehensionQuestions;
      } catch {
        throw new BadRequestException('Invalid comprehension questions format');
      }
      
      if (Array.isArray(questions) && questions.length > 0) {
        this.questionValidationService.validateQuestions(questions);
        const sanitizedQuestions = this.questionValidationService.sanitizeQuestions(questions);
        const validatedQuestions = this.contentSanitizerService.validateQuestionContent(sanitizedQuestions);
        contentData.comprehensionQuestions = JSON.stringify(validatedQuestions);
      }
    }
    
    // Create content without many-to-many fields
    const { authorId: authorIds, categoryId: categoryIds, isAuthor, authorName, ...contentToSave } = contentData;
    
    const content = this.contentRepository.create(contentToSave);
    const savedContentArray = await this.contentRepository.save(content);
    const savedContent = Array.isArray(savedContentArray) ? savedContentArray[0] : savedContentArray;

    // Create author relationships
    if (authorIds && Array.isArray(authorIds)) {
      for (const authorId of authorIds) {
        await this.contentAuthorRepository.save({
          contentId: savedContent.id,
          authorId: authorId
        });
      }
    }

    // Create category relationships
    if (categoryIds && Array.isArray(categoryIds)) {
      for (const categoryId of categoryIds) {
        await this.contentCategoryRepository.save({
          contentId: savedContent.id,
          categoryId: categoryId
        });
      }
    }

    return savedContent;
  }

  async getContentById(id: string) {
    const content = await this.contentRepository
      .createQueryBuilder('content')
      .leftJoinAndSelect('content.ageGroup', 'ageGroup')
      .leftJoinAndSelect('content.contributor', 'contributor')
      .leftJoinAndSelect('content.contentAuthors', 'contentAuthors')
      .leftJoinAndSelect('contentAuthors.author', 'author')
      .leftJoinAndSelect('content.contentCategories', 'contentCategories')
      .leftJoinAndSelect('contentCategories.category', 'category')
      .where('content.id = :id', { id })
      .getOne();

    if (!content) {
      throw new BadRequestException('Content not found');
    }

    return {
      ...content,
      authorId: content.contentAuthors?.map(ca => ca.author.id) || [],
      categoryId: content.contentCategories?.map(cc => cc.category.id) || []
    };
  }

  async updateContent(id: string, contentData: any, userRole?: string) {
    const existingContent = await this.contentRepository.findOne({ where: { id } });
    if (!existingContent) {
      throw new BadRequestException('Content not found');
    }

    // Super admins and moderators can edit any content, contributors can only edit pending content
    if (userRole !== 'super_admin' && userRole !== 'moderator' && existingContent.status !== 'pending') {
      throw new BadRequestException('Only pending content can be edited');
    }

    // Remove existing relationships
    await this.contentAuthorRepository.delete({ contentId: id });
    await this.contentCategoryRepository.delete({ contentId: id });

    // Update content - use save() to trigger @UpdateDateColumn
    const { authorId: authorIds, categoryId: categoryIds, ...contentToUpdate } = contentData;
    await this.contentRepository.save({ id, ...contentToUpdate });

    // Recreate relationships
    if (authorIds && Array.isArray(authorIds)) {
      for (const authorId of authorIds) {
        await this.contentAuthorRepository.save({ contentId: id, authorId });
      }
    }

    if (categoryIds && Array.isArray(categoryIds)) {
      for (const categoryId of categoryIds) {
        await this.contentCategoryRepository.save({ contentId: id, categoryId });
      }
    }

    return this.getContentById(id);
  }

  async updateContentStatus(id: string, status: 'verified' | 'rejected', reason?: string) {
    const updateData: any = { id, status };
    if (reason) {
      updateData.rejectionReason = reason;
    }
    return this.contentRepository.save(updateData);
  }

  async getAllContent(search?: string, page: number = 1, limit: number = 10) {
    const queryBuilder = this.contentRepository.createQueryBuilder('content')
      .leftJoinAndSelect('content.contributor', 'contributor')
      .leftJoinAndSelect('content.ageGroup', 'ageGroup');

    if (search) {
      queryBuilder.where(
        '(content.title ILIKE :search OR content.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const total = await queryBuilder.getCount();
    const data = await queryBuilder
      .orderBy('content.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getContentByContributor(contributorId: string) {
    return this.contentRepository.find({
      where: { contributorId },
      relations: ['ageGroup'],
      order: { createdAt: 'DESC' },
    });
  }

  async getContentByCountry(countryCode: string, search?: string, page: number = 1, limit: number = 10) {
    const queryBuilder = this.contentRepository
      .createQueryBuilder('content')
      .leftJoinAndSelect('content.ageGroup', 'ageGroup')
      .where('content.targetCountries LIKE :country', { country: `%"${countryCode}"%` })
      .andWhere('content.status = :status', { status: 'verified' });

    if (search) {
      queryBuilder.andWhere(
        '(content.title ILIKE :search OR content.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const total = await queryBuilder.getCount();
    const data = await queryBuilder
      .orderBy('content.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getAdminContent(filters: {
    search?: string;
    status?: string;
    contributorId?: string;
    authorId?: string;
    categoryId?: string;
    ageGroupId?: string;
    page: number;
    limit: number;
  }) {
    const { search, status, contributorId, authorId, categoryId, ageGroupId, page, limit } = filters;

    const queryBuilder = this.contentRepository
      .createQueryBuilder('content')
      .leftJoinAndSelect('content.contributor', 'contributor')
      .leftJoinAndSelect('content.ageGroup', 'ageGroup')
      .leftJoinAndSelect('content.contentAuthors', 'contentAuthors')
      .leftJoinAndSelect('contentAuthors.author', 'author')
      .leftJoinAndSelect('content.contentCategories', 'contentCategories')
      .leftJoinAndSelect('contentCategories.category', 'category');

    // Apply filters - use where() for conditions to ensure proper query building
    let hasWhere = false;

    if (status) {
      queryBuilder.where('content.status = :status', { status });
      hasWhere = true;
    }

    if (contributorId) {
      if (hasWhere) {
        queryBuilder.andWhere('content.contributorId = :contributorId', { contributorId });
      } else {
        queryBuilder.where('content.contributorId = :contributorId', { contributorId });
        hasWhere = true;
      }
    }

    if (ageGroupId) {
      if (hasWhere) {
        queryBuilder.andWhere('content.ageGroupId = :ageGroupId', { ageGroupId });
      } else {
        queryBuilder.where('content.ageGroupId = :ageGroupId', { ageGroupId });
        hasWhere = true;
      }
    }

    if (authorId) {
      if (hasWhere) {
        queryBuilder.andWhere('contentAuthors.authorId = :authorId', { authorId });
      } else {
        queryBuilder.where('contentAuthors.authorId = :authorId', { authorId });
        hasWhere = true;
      }
    }

    if (categoryId) {
      if (hasWhere) {
        queryBuilder.andWhere('contentCategories.categoryId = :categoryId', { categoryId });
      } else {
        queryBuilder.where('contentCategories.categoryId = :categoryId', { categoryId });
        hasWhere = true;
      }
    }

    if (search) {
      if (hasWhere) {
        queryBuilder.andWhere(
          '(content.title ILIKE :search OR content.description ILIKE :search)',
          { search: `%${search}%` }
        );
      } else {
        queryBuilder.where(
          '(content.title ILIKE :search OR content.description ILIKE :search)',
          { search: `%${search}%` }
        );
        hasWhere = true;
      }
    }

    const total = await queryBuilder.getCount();
    const data = await queryBuilder
      .orderBy('content.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Transform data to include author and category arrays
    const transformedData = data.map(content => ({
      ...content,
      authors: content.contentAuthors?.map(ca => ca.author) || [],
      categories: content.contentCategories?.map(cc => cc.category) || []
    }));

    return {
      data: transformedData,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }
}