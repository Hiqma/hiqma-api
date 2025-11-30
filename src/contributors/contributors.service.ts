import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContributorApplication, User, Author } from '../database/entities';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class ContributorsService {
  constructor(
    @InjectRepository(ContributorApplication)
    private applicationRepository: Repository<ContributorApplication>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Author)
    private authorRepository: Repository<Author>,
  ) {}

  async submitApplication(applicationData: Partial<ContributorApplication>) {
    // Check if user already exists with this email
    const existingUser = await this.userRepository.findOne({ 
      where: { email: applicationData.email } 
    });
    if (existingUser) {
      throw new Error('A user with this email already exists');
    }

    // Check if there's already a pending application with this email
    const existingApplication = await this.applicationRepository.findOne({ 
      where: { email: applicationData.email } 
    });
    if (existingApplication) {
      throw new Error('An application with this email already exists');
    }

    const application = this.applicationRepository.create(applicationData);
    return this.applicationRepository.save(application);
  }

  async getPendingApplications() {
    return this.applicationRepository.find({
      where: { status: 'pending' },
      order: { appliedAt: 'ASC' },
    });
  }

  async reviewApplication(id: string, status: 'approved' | 'rejected', reviewerId: string | null) {
    const application = await this.applicationRepository.findOne({ where: { id } });
    if (!application) throw new Error('Application not found');

    application.status = status;
    application.reviewedAt = new Date();
    application.reviewedBy = reviewerId;

    if (status === 'approved') {
      // Create contributor user account
      const hashedPassword = await bcrypt.hash('temp123', 10);
      const user = this.userRepository.create({
        email: application.email,
        password: hashedPassword,
        role: 'contributor',
        name: application.name,
        institution: application.institution,
        expertise: application.expertise,
        country: 'KE', // Default, should be updated
        continent: 'Africa',
      });
      await this.userRepository.save(user);
    }

    return this.applicationRepository.save(application);
  }
}