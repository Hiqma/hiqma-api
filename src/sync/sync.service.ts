import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Content, ActivityLog } from '../database/entities';

@Injectable()
export class SyncService {
  constructor(
    @InjectRepository(Content)
    private contentRepository: Repository<Content>,
    @InjectRepository(ActivityLog)
    private activityLogRepository: Repository<ActivityLog>,
  ) {}

  async getVerifiedContent() {
    const content = await this.contentRepository.find({
      where: { status: 'verified' },
      order: { createdAt: 'DESC' },
    });

    // Extract images from HTML content and include cover image
    return content.map(item => {
      const htmlImages = this.extractImagesFromHtml(item.htmlContent || '');
      const allImages = [...htmlImages];
      
      // Add cover image if it exists
      if (item.coverImageUrl) {
        allImages.unshift(item.coverImageUrl); // Add cover image at the beginning
      }
      
      return {
        ...item,
        images: allImages
      };
    });
  }

  private extractImagesFromHtml(html: string): string[] {
    const images: string[] = [];
    const imgRegex = /<img[^>]+src="([^"]+)"/g;
    let match;
    
    while ((match = imgRegex.exec(html)) !== null) {
      images.push(match[1]);
    }
    
    return images;
  }

  async uploadActivityLogs(logs: Partial<ActivityLog>[]) {
    const entities = this.activityLogRepository.create(logs);
    return this.activityLogRepository.save(entities);
  }

  async getLeaderboard() {
    // Simplified leaderboard calculation
    const hubStats = await this.activityLogRepository
      .createQueryBuilder('log')
      .select('log.hubId', 'hubId')
      .addSelect('COUNT(*)', 'activities')
      .addSelect('SUM(log.timeSpent)', 'totalTime')
      .groupBy('log.hubId')
      .orderBy('SUM(log.timeSpent)', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      hubRank: hubStats.map((stat, index) => ({
        id: stat.hubId,
        name: `Hub ${stat.hubId.slice(0, 8)}`,
        points: parseInt(stat.totalTime) || 0,
        rank: index + 1,
      })),
      countryRank: [],
      continentRank: [],
      globalRank: [],
    };
  }
}