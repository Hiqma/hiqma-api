import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog, User, Content, EdgeHub } from '../database/entities';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(ActivityLog)
    private activityLogRepository: Repository<ActivityLog>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Content)
    private contentRepository: Repository<Content>,
    @InjectRepository(EdgeHub)
    private edgeHubRepository: Repository<EdgeHub>,
  ) {}

  async getEngagementStats() {
    // Get real counts from actual tables
    const totalUsers = await this.userRepository.count();
    const totalContent = await this.contentRepository.count();
    
    // Get activity-based stats if activity logs exist
    const totalSessions = await this.activityLogRepository.count();
    
    let activeUsers = 0;
    let edgeHubs = 0;
    let completionRate = 0;
    
    if (totalSessions > 0) {
      // Get unique users from activity logs
      const activeUsersResult = await this.activityLogRepository
        .createQueryBuilder('log')
        .select('COUNT(DISTINCT log.userId)', 'count')
        .getRawOne();
      activeUsers = parseInt(activeUsersResult.count) || 0;

      // Get edge hubs count
      edgeHubs = await this.edgeHubRepository.count();

      // Get completion rate
      const completionRateResult = await this.activityLogRepository
        .createQueryBuilder('log')
        .select('COUNT(CASE WHEN log.moduleCompleted = true THEN 1 END) * 100.0 / COUNT(*)', 'rate')
        .getRawOne();
      completionRate = parseFloat(completionRateResult.rate) || 0;
    } else {
      // If no activity logs, use total users as active users
      activeUsers = totalUsers;
      edgeHubs = await this.edgeHubRepository.count();
      completionRate = 0;
    }

    return {
      totalContent,
      activeUsers,
      edgeHubs,
      completionRate,
    };
  }

  async getContentPopularity() {
    return this.activityLogRepository
      .createQueryBuilder('log')
      .select('log.contentId', 'contentId')
      .addSelect('COUNT(*)', 'sessions')
      .addSelect('AVG(log.timeSpent)', 'avgTime')
      .groupBy('log.contentId')
      .orderBy('sessions', 'DESC')
      .limit(10)
      .getRawMany();
  }
}