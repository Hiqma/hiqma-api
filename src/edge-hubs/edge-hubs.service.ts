import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EdgeHub, HubContent, Content, Device, Student } from '../database/entities';
import { SecurityService } from '../security/security.service';
import * as crypto from 'crypto';

@Injectable()
export class EdgeHubsService {
  constructor(
    @InjectRepository(EdgeHub)
    private edgeHubRepository: Repository<EdgeHub>,
    @InjectRepository(HubContent)
    private hubContentRepository: Repository<HubContent>,
    @InjectRepository(Content)
    private contentRepository: Repository<Content>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    private securityService: SecurityService,
  ) {}

  async findAll() {
    return this.edgeHubRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  async findOne(id: number) {
    return this.edgeHubRepository.findOne({ where: { id } });
  }

  async create(createEdgeHubDto: any) {
    const hubId = this.generateHubId();
    const encryptionKey = this.generateEncryptionKey();
    
    const edgeHub = this.edgeHubRepository.create({
      ...createEdgeHubDto,
      hubId,
      encryptionKey,
    });
    
    return this.edgeHubRepository.save(edgeHub);
  }

  async update(id: number, updateEdgeHubDto: any) {
    await this.edgeHubRepository.update(id, updateEdgeHubDto);
    return this.findOne(id);
  }

  async remove(id: number) {
    return this.edgeHubRepository.delete(id);
  }

  async getHubContent(hubId: string, filters?: { assigned?: boolean; search?: string; page?: number; limit?: number }) {
    const { assigned, search, page = 1, limit = 10 } = filters || {};
    
    // First, find the hub by hubId to get the numeric id
    const hub = await this.edgeHubRepository.findOne({ where: { hubId } });
    if (!hub) {
      throw new Error('Hub not found');
    }
    
    const queryBuilder = this.contentRepository
      .createQueryBuilder('content')
      .leftJoinAndSelect('content.ageGroup', 'ageGroup')
      .leftJoinAndSelect('content.contentCategories', 'contentCategories')
      .leftJoinAndSelect('contentCategories.category', 'category')
      .leftJoin('hub_content', 'hubContent', 'hubContent.contentId = content.id AND hubContent.hubId = :numericHubId', { numericHubId: hub.id })
      .where('content.status = :status', { status: 'verified' });

    // Filter by assignment status
    if (assigned === true) {
      queryBuilder.andWhere('hubContent.id IS NOT NULL');
    } else if (assigned === false) {
      queryBuilder.andWhere('hubContent.id IS NULL');
    }

    // Search filter
    if (search) {
      queryBuilder.andWhere(
        '(content.title ILIKE :search OR content.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Add assignment info to select
    queryBuilder.addSelect('CASE WHEN hubContent.id IS NOT NULL THEN true ELSE false END', 'isAssigned');

    const total = await queryBuilder.getCount();
    const data = await queryBuilder
      .orderBy('content.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Check assignment status for each content
    const contentWithAssignment = await Promise.all(
      data.map(async (content) => {
        const assignment = await this.hubContentRepository.findOne({
          where: { hubId: hub.id, contentId: content.id }
        });
        return {
          ...content,
          isAssigned: !!assignment,
          assignedAt: assignment?.assignedAt
        };
      })
    );

    return {
      data: contentWithAssignment,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async assignContentToHub(hubId: string, contentId: string) {
    // Find the hub by hubId to get the numeric id
    const hub = await this.edgeHubRepository.findOne({ where: { hubId } });
    if (!hub) {
      throw new Error('Hub not found');
    }
    
    // Check if already assigned
    const existing = await this.hubContentRepository.findOne({
      where: { hubId: hub.id, contentId }
    });

    if (existing) {
      return { message: 'Content already assigned to this hub' };
    }

    const assignment = this.hubContentRepository.create({ hubId: hub.id, contentId });
    await this.hubContentRepository.save(assignment);
    
    return { message: 'Content assigned successfully' };
  }

  async unassignContentFromHub(hubId: string, contentId: string) {
    // Find the hub by hubId to get the numeric id
    const hub = await this.edgeHubRepository.findOne({ where: { hubId } });
    if (!hub) {
      throw new Error('Hub not found');
    }
    
    await this.hubContentRepository.delete({ hubId: hub.id, contentId });
    return { message: 'Content unassigned successfully' };
  }

  async getAssignedContent(hubId: string, since?: string) {
    // Find the hub by hubId to get the numeric id
    const hub = await this.edgeHubRepository.findOne({ where: { hubId } });
    if (!hub) {
      throw new Error('Hub not found');
    }
    
    const queryBuilder = this.hubContentRepository
      .createQueryBuilder('hubContent')
      .leftJoinAndSelect('hubContent.content', 'content')
      .leftJoinAndSelect('content.ageGroup', 'ageGroup')
      .leftJoinAndSelect('content.contentCategories', 'contentCategories')
      .leftJoinAndSelect('contentCategories.category', 'category')
      .where('hubContent.hubId = :numericHubId', { numericHubId: hub.id })
      .andWhere('content.status = :status', { status: 'verified' });

    // Incremental sync: only fetch content updated after 'since' timestamp
    if (since) {
      queryBuilder.andWhere('content.updatedAt > :since', { since: new Date(since) });
    }

    const assignments = await queryBuilder.getMany();
    
    return assignments.map(assignment => ({
      ...assignment.content,
      categories: assignment.content.contentCategories?.map(cc => cc.category) || []
    }));
  }

  async getSyncData(hubId: string, since?: string) {
    // Find the hub by hubId to get the numeric id
    const hub = await this.edgeHubRepository.findOne({ where: { hubId } });
    if (!hub) {
      throw new Error('Hub not found');
    }

    // Get content (existing logic)
    const content = await this.getAssignedContent(hubId, since);

    // Get devices for this hub
    const devices = await this.deviceRepository.find({
      where: { hubId: hubId },
      select: ['id', 'deviceCode', 'name', 'status', 'createdAt', 'updatedAt']
    });

    // Get students for this hub
    const students = await this.studentRepository.find({
      where: { hubId: hubId },
      select: ['id', 'studentCode', 'firstNameEncrypted', 'lastNameEncrypted', 'grade', 'age', 'metadataEncrypted', 'status', 'createdAt', 'updatedAt']
    });

    return {
      content,
      devices: devices.map(device => ({
        id: device.id,
        hubId: hubId,
        deviceCode: device.deviceCode,
        name: device.name,
        status: device.status,
        createdAt: device.createdAt,
        updatedAt: device.updatedAt
      })),
      students: students.map(student => ({
        id: student.id,
        studentCode: student.studentCode,
        firstName: student.firstNameEncrypted ? this.securityService.decrypt(student.firstNameEncrypted) : null,
        lastName: student.lastNameEncrypted ? this.securityService.decrypt(student.lastNameEncrypted) : null,
        grade: student.grade,
        age: student.age,
        metadata: student.metadataEncrypted ? this.securityService.decrypt(student.metadataEncrypted) : null,
        status: student.status,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt
      }))
    };
  }

  async updateMetrics(hubId: string, metrics: {
    totalReaders?: number;
    activeReaders?: number;
    totalContent?: number;
    dataTransferred?: number;
  }) {
    const hub = await this.edgeHubRepository.findOne({ where: { hubId } });
    if (!hub) {
      throw new Error('Hub not found');
    }

    await this.edgeHubRepository.update(hub.id, {
      ...metrics,
      lastMetricsUpdate: new Date()
    });

    return { message: 'Metrics updated successfully' };
  }

  private generateHubId(): string {
    return `HUB-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
  }

  private generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}