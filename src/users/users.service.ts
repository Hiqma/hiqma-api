import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Author, Content } from '../database/entities';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Author)
    private authorRepository: Repository<Author>,
    @InjectRepository(Content)
    private contentRepository: Repository<Content>,
  ) {}

  async getUsers() {
    return this.userRepository.find({
      select: ['id', 'email', 'name', 'role', 'institution', 'expertise', 'country', 'continent', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
  }

  async getContributors() {
    return this.userRepository.find({
      where: { role: 'contributor' },
      select: ['id', 'email', 'name'],
      order: { name: 'ASC' },
    });
  }

  async changePassword(id: string, newPassword: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.update(id, { password: hashedPassword });
    
    return { message: 'Password changed successfully' };
  }

  async getUserProfile(id: string) {
    const user = await this.userRepository.findOne({ 
      where: { id },
      select: ['id', 'email', 'name', 'role', 'institution', 'expertise', 'country', 'continent', 'createdAt']
    });
    
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user is also an author
    const author = await this.authorRepository.findOne({ 
      where: { contributorId: id } 
    });

    let authoredContent = [];
    if (author) {
      authoredContent = await this.contentRepository
        .createQueryBuilder('content')
        .innerJoin('content.contentAuthors', 'contentAuthor')
        .where('contentAuthor.authorId = :authorId', { authorId: author.id })
        .select(['content.id', 'content.title', 'content.description', 'content.language', 'content.status', 'content.createdAt'])
        .getMany();
    }

    return {
      user,
      isAuthor: !!author,
      author,
      authoredContent
    };
  }
}