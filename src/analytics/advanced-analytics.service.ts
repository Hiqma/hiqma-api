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
    // Use TypeORM query builder instead of raw SQL to handle relationships properly
    const results = await this.activityRepository
      .createQueryBuilder('a')
      .select('c.id', 'id')
      .addSelect('c.title', 'title')
      .addSelect('ag.name', 'ageGroup')
      .addSelect('c.language', 'language')
      .addSelect('c.description', 'description')
      .addSelect('COUNT(a.id)', 'totalsessions')
      .addSelect('AVG(a.timeSpent)', 'avgtimespent')
      .addSelect('AVG(a.quizScore)', 'avgquizscore')
      .addSelect('COUNT(DISTINCT a.deviceId)', 'uniquedevices')
      .addSelect('COUNT(DISTINCT a.studentId)', 'uniquestudents')
      .addSelect('COUNT(CASE WHEN a.moduleCompleted = true THEN 1 END)', 'completions')
      .addSelect('(COUNT(CASE WHEN a.moduleCompleted = true THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0))', 'completionrate')
      .leftJoin('content', 'c', 'c.id = a.contentId')
      .leftJoin('age_groups', 'ag', 'ag.id = c.ageGroupId')
      .where('c.status = :status', { status: 'verified' })
      .groupBy('c.id, c.title, ag.name, c.language, c.description')
      .orderBy('totalsessions', 'DESC')
      .limit(50)
      .getRawMany();

    // Get category for each content (since it's many-to-many)
    const contentIds = results.map(r => r.id);
    if (contentIds.length > 0) {
      const categories = await this.activityRepository.query(`
        SELECT cc."contentId", cat.name as category
        FROM content_categories cc
        JOIN categories cat ON cat.id = cc."categoryId"
        WHERE cc."contentId" = ANY($1)
      `, [contentIds]);

      const categoryMap = new Map();
      categories.forEach((cat: any) => {
        if (!categoryMap.has(cat.contentId)) {
          categoryMap.set(cat.contentId, []);
        }
        categoryMap.get(cat.contentId).push(cat.category);
      });

      // Transform results to match expected format
      results.forEach(result => {
        result.category = categoryMap.get(result.id)?.join(', ') || 'Uncategorized';
        result.totalSessions = parseInt(result.totalsessions) || 0;
        result.avgTimeSpent = parseFloat(result.avgtimespent) || 0;
        result.avgQuizScore = parseFloat(result.avgquizscore) || 0;
        result.uniqueDevices = parseInt(result.uniquedevices) || 0;
        result.uniqueStudents = parseInt(result.uniquestudents) || 0;
        result.completionRate = parseFloat(result.completionrate) || 0;
        result.uniqueUsers = result.uniqueDevices + result.uniqueStudents;
        
        // Clean up lowercase aliases
        delete result.totalsessions;
        delete result.avgtimespent;
        delete result.avgquizscore;
        delete result.uniquedevices;
        delete result.uniquestudents;
        delete result.completionrate;
      });
    }

    return results;
  }

  async getLearningTrends(days: number = 30) {
    const query = `
      SELECT 
        DATE(a.timestamp) as date,
        COUNT(DISTINCT a."sessionId") as "uniqueSessions",
        COUNT(a.id) as "totalActivities",
        AVG(a."timeSpent") as "avgTimeSpent",
        AVG(a."quizScore") as "avgQuizScore",
        COUNT(CASE WHEN a."moduleCompleted" = true THEN 1 END) as completions
      FROM activity_logs a
      WHERE a.timestamp >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(a.timestamp)
      ORDER BY date DESC
    `;
    
    return this.activityRepository.query(query);
  }

  async getHubAnalytics() {
    const query = `
      SELECT 
        a."hubId",
        COUNT(DISTINCT a."sessionId") as "uniqueUsers",
        COUNT(a.id) as "totalSessions",
        SUM(a."timeSpent") as "totalTimeSpent",
        AVG(a."quizScore") as "avgQuizScore",
        COUNT(CASE WHEN a."moduleCompleted" = true THEN 1 END) as "totalCompletions"
      FROM activity_logs a
      GROUP BY a."hubId"
      ORDER BY "uniqueUsers" DESC
    `;
    
    return this.activityRepository.query(query);
  }

  async getSubjectAnalytics() {
    // Get analytics by category using the many-to-many relationship
    const query = `
      SELECT 
        cat.name as subject,
        COUNT(DISTINCT a."sessionId") as "uniqueLearners",
        COUNT(a.id) as "totalSessions",
        AVG(a."timeSpent") as "avgTimeSpent",
        AVG(a."quizScore") as "avgQuizScore",
        (COUNT(CASE WHEN a."moduleCompleted" = true THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0)) as "completionRate"
      FROM categories cat
      JOIN content_categories cc ON cat.id = cc."categoryId"
      JOIN content c ON c.id = cc."contentId"
      JOIN activity_logs a ON c.id = a."contentId"
      WHERE c.status = 'verified'
      GROUP BY cat.name
      ORDER BY "uniqueLearners" DESC
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