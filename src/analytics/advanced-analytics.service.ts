import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog, Content } from '../database/entities';

@Injectable()
export class AdvancedAnalyticsService {
  constructor(
    @InjectRepository(ActivityLog)
    private activityRepository: Repository<ActivityLog>,
    @InjectRepository(Content)
    private contentRepository: Repository<Content>,
  ) {}

  async getContentPerformance() {
    const query = `
      SELECT 
        c.id,
        c.title,
        c.category,
        c.ageGroup,
        COUNT(a.id) as totalSessions,
        AVG(a.timeSpent) as avgTimeSpent,
        AVG(a.quizScore) as avgQuizScore,
        COUNT(CASE WHEN a.moduleCompleted = true THEN 1 END) as completions,
        (COUNT(CASE WHEN a.moduleCompleted = true THEN 1 END) * 100.0 / COUNT(a.id)) as completionRate
      FROM content c
      LEFT JOIN activity_logs a ON c.id = a."contentId"
      WHERE c.status = 'verified'
      GROUP BY c.id, c.title, c.category, c.ageGroup
      ORDER BY totalSessions DESC
    `;
    
    return this.activityRepository.query(query);
  }

  async getLearningTrends(days: number = 30) {
    const query = `
      SELECT 
        DATE(a.timestamp) as date,
        COUNT(DISTINCT a.sessionId) as uniqueSessions,
        COUNT(a.id) as totalActivities,
        AVG(a.timeSpent) as avgTimeSpent,
        AVG(a.quizScore) as avgQuizScore,
        COUNT(CASE WHEN a.moduleCompleted = true THEN 1 END) as completions
      FROM activity_logs a
      WHERE a.timestamp >= DATE('now', '-${days} days')
      GROUP BY DATE(a.timestamp)
      ORDER BY date DESC
    `;
    
    return this.activityRepository.query(query);
  }

  async getHubAnalytics() {
    const query = `
      SELECT 
        a.hubId,
        COUNT(DISTINCT a.sessionId) as uniqueUsers,
        COUNT(a.id) as totalSessions,
        SUM(a.timeSpent) as totalTimeSpent,
        AVG(a.quizScore) as avgQuizScore,
        COUNT(CASE WHEN a.moduleCompleted = true THEN 1 END) as totalCompletions
      FROM activity_logs a
      GROUP BY a.hubId
      ORDER BY uniqueUsers DESC
    `;
    
    return this.activityRepository.query(query);
  }

  async getSubjectAnalytics() {
    const query = `
      SELECT 
        c.category as subject,
        COUNT(DISTINCT a.sessionId) as uniqueLearners,
        COUNT(a.id) as totalSessions,
        AVG(a.timeSpent) as avgTimeSpent,
        AVG(a.quizScore) as avgQuizScore,
        (COUNT(CASE WHEN a.moduleCompleted = true THEN 1 END) * 100.0 / COUNT(a.id)) as completionRate
      FROM content c
      JOIN activity_logs a ON c.id = a."contentId"
      GROUP BY c.category
      ORDER BY uniqueLearners DESC
    `;
    
    return this.activityRepository.query(query);
  }

  async getEngagementMetrics() {
    const totalContent = await this.contentRepository.count({ where: { status: 'verified' } });
    const totalSessions = await this.activityRepository.count();
    const completedSessions = await this.activityRepository.count({ where: { moduleCompleted: true } });
    
    const avgTimeSpent = await this.activityRepository
      .createQueryBuilder('activity')
      .select('AVG(activity.timeSpent)', 'avg')
      .getRawOne();

    const avgQuizScore = await this.activityRepository
      .createQueryBuilder('activity')
      .select('AVG(activity.quizScore)', 'avg')
      .where('activity.quizScore IS NOT NULL')
      .getRawOne();

    return {
      totalContent,
      totalSessions,
      completedSessions,
      completionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
      avgTimeSpent: parseFloat(avgTimeSpent.avg) || 0,
      avgQuizScore: parseFloat(avgQuizScore.avg) || 0,
    };
  }

  async exportAnalytics(format: 'csv' | 'json' = 'json') {
    const [performance, trends, hubs, subjects, engagement] = await Promise.all([
      this.getContentPerformance(),
      this.getLearningTrends(),
      this.getHubAnalytics(),
      this.getSubjectAnalytics(),
      this.getEngagementMetrics(),
    ]);

    const data = {
      contentPerformance: performance,
      learningTrends: trends,
      hubAnalytics: hubs,
      subjectAnalytics: subjects,
      engagementMetrics: engagement,
      exportedAt: new Date().toISOString(),
    };

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return data;
  }

  private convertToCSV(data: any): string {
    const csvSections: string[] = [];
    
    // Content Performance CSV
    if (data.contentPerformance.length > 0) {
      const headers = Object.keys(data.contentPerformance[0]).join(',');
      const rows = data.contentPerformance.map((row: any) => Object.values(row).join(','));
      csvSections.push(`Content Performance\n${headers}\n${rows.join('\n')}`);
    }

    return csvSections.join('\n\n');
  }
}