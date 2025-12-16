import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog, User, Content, EdgeHub, Device, Student } from '../database/entities';

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
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
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

  /**
   * Get enhanced engagement stats with device and student tracking
   */
  async getEnhancedEngagementStats() {
    const totalUsers = await this.userRepository.count();
    const totalContent = await this.contentRepository.count();
    const totalDevices = await this.deviceRepository.count();
    const totalStudents = await this.studentRepository.count();
    const activeDevices = await this.deviceRepository.count({ where: { status: 'active' } });
    const activeStudents = await this.studentRepository.count({ where: { status: 'active' } });
    
    // Get activity-based stats
    const totalSessions = await this.activityLogRepository.count();
    
    let uniqueDevicesUsed = 0;
    let uniqueStudentsActive = 0;
    let completionRate = 0;
    
    if (totalSessions > 0) {
      // Get unique devices from activity logs
      const uniqueDevicesResult = await this.activityLogRepository
        .createQueryBuilder('log')
        .select('COUNT(DISTINCT log.deviceId)', 'count')
        .where('log.deviceId IS NOT NULL')
        .getRawOne();
      uniqueDevicesUsed = parseInt(uniqueDevicesResult.count) || 0;

      // Get unique students from activity logs
      const uniqueStudentsResult = await this.activityLogRepository
        .createQueryBuilder('log')
        .select('COUNT(DISTINCT log.studentId)', 'count')
        .where('log.studentId IS NOT NULL')
        .getRawOne();
      uniqueStudentsActive = parseInt(uniqueStudentsResult.count) || 0;

      // Get completion rate
      const completionRateResult = await this.activityLogRepository
        .createQueryBuilder('log')
        .select('COUNT(CASE WHEN log.moduleCompleted = true THEN 1 END) * 100.0 / COUNT(*)', 'rate')
        .getRawOne();
      completionRate = parseFloat(completionRateResult.rate) || 0;
    }

    const edgeHubs = await this.edgeHubRepository.count();

    return {
      totalContent,
      totalUsers,
      totalDevices,
      totalStudents,
      activeDevices,
      activeStudents,
      uniqueDevicesUsed,
      uniqueStudentsActive,
      edgeHubs,
      totalSessions,
      completionRate,
    };
  }

  /**
   * Get device-specific analytics
   */
  async getDeviceAnalytics(deviceId: string, dateRange?: { start: Date; end: Date }) {
    let query = this.activityLogRepository
      .createQueryBuilder('log')
      .where('log.deviceId = :deviceId', { deviceId });

    if (dateRange) {
      query = query.andWhere('log.timestamp BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    const totalSessions = await query.getCount();
    
    const timeSpentResult = await query
      .select('SUM(log.timeSpent)', 'totalTime')
      .addSelect('AVG(log.timeSpent)', 'avgTime')
      .getRawOne();

    const completionStats = await query
      .select('COUNT(CASE WHEN log.moduleCompleted = true THEN 1 END)', 'completed')
      .addSelect('COUNT(*)', 'total')
      .getRawOne();

    const contentUsage = await query
      .select('log.contentId', 'contentId')
      .addSelect('COUNT(*)', 'sessions')
      .addSelect('SUM(log.timeSpent)', 'totalTime')
      .groupBy('log.contentId')
      .orderBy('sessions', 'DESC')
      .getRawMany();

    const studentUsage = await query
      .select('log.studentId', 'studentId')
      .addSelect('COUNT(*)', 'sessions')
      .addSelect('SUM(log.timeSpent)', 'totalTime')
      .where('log.studentId IS NOT NULL')
      .groupBy('log.studentId')
      .orderBy('sessions', 'DESC')
      .getRawMany();

    return {
      deviceId,
      totalSessions,
      totalTimeSpent: parseInt(timeSpentResult.totalTime) || 0,
      averageTimeSpent: parseFloat(timeSpentResult.avgTime) || 0,
      completionRate: completionStats.total > 0 ? 
        (parseInt(completionStats.completed) / parseInt(completionStats.total)) * 100 : 0,
      contentUsage,
      studentUsage,
    };
  }

  /**
   * Get student-specific analytics
   */
  async getStudentAnalytics(studentId: string, dateRange?: { start: Date; end: Date }) {
    let query = this.activityLogRepository
      .createQueryBuilder('log')
      .where('log.studentId = :studentId', { studentId });

    if (dateRange) {
      query = query.andWhere('log.timestamp BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    const totalSessions = await query.getCount();
    
    const timeSpentResult = await query
      .select('SUM(log.timeSpent)', 'totalTime')
      .addSelect('AVG(log.timeSpent)', 'avgTime')
      .getRawOne();

    const completionStats = await query
      .select('COUNT(CASE WHEN log.moduleCompleted = true THEN 1 END)', 'completed')
      .addSelect('COUNT(*)', 'total')
      .getRawOne();

    const contentProgress = await query
      .select('log.contentId', 'contentId')
      .addSelect('COUNT(*)', 'sessions')
      .addSelect('SUM(log.timeSpent)', 'totalTime')
      .addSelect('AVG(log.quizScore)', 'avgQuizScore')
      .addSelect('MAX(log.moduleCompleted)', 'completed')
      .groupBy('log.contentId')
      .orderBy('sessions', 'DESC')
      .getRawMany();

    const deviceUsage = await query
      .select('log.deviceId', 'deviceId')
      .addSelect('COUNT(*)', 'sessions')
      .addSelect('SUM(log.timeSpent)', 'totalTime')
      .where('log.deviceId IS NOT NULL')
      .groupBy('log.deviceId')
      .orderBy('sessions', 'DESC')
      .getRawMany();

    // Get learning progression over time
    const learningProgression = await query
      .select('DATE(log.timestamp)', 'date')
      .addSelect('COUNT(*)', 'sessions')
      .addSelect('SUM(log.timeSpent)', 'timeSpent')
      .addSelect('AVG(log.quizScore)', 'avgScore')
      .groupBy('DATE(log.timestamp)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      studentId,
      totalSessions,
      totalTimeSpent: parseInt(timeSpentResult.totalTime) || 0,
      averageTimeSpent: parseFloat(timeSpentResult.avgTime) || 0,
      completionRate: completionStats.total > 0 ? 
        (parseInt(completionStats.completed) / parseInt(completionStats.total)) * 100 : 0,
      contentProgress,
      deviceUsage,
      learningProgression,
    };
  }

  /**
   * Get hub-level analytics with device and student breakdown
   */
  async getHubAnalytics(hubId: string, dateRange?: { start: Date; end: Date }) {
    let query = this.activityLogRepository
      .createQueryBuilder('log')
      .where('log.hubId = :hubId', { hubId });

    if (dateRange) {
      query = query.andWhere('log.timestamp BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end,
      });
    }

    // Get basic stats
    const totalSessions = await query.getCount();
    
    const timeSpentResult = await query
      .select('SUM(log.timeSpent)', 'totalTime')
      .addSelect('AVG(log.timeSpent)', 'avgTime')
      .getRawOne();

    // Get device stats for this hub
    const hubDevices = await this.deviceRepository.count({ where: { hubId } });
    const activeHubDevices = await this.deviceRepository.count({ 
      where: { hubId, status: 'active' } 
    });

    // Get student stats for this hub
    const hubStudents = await this.studentRepository.count({ where: { hubId } });
    const activeHubStudents = await this.studentRepository.count({ 
      where: { hubId, status: 'active' } 
    });

    // Get unique devices and students used in this time period
    const uniqueDevicesResult = await query
      .select('COUNT(DISTINCT log.deviceId)', 'count')
      .where('log.deviceId IS NOT NULL')
      .getRawOne();

    const uniqueStudentsResult = await query
      .select('COUNT(DISTINCT log.studentId)', 'count')
      .where('log.studentId IS NOT NULL')
      .getRawOne();

    // Get top performing content
    const topContent = await query
      .select('log.contentId', 'contentId')
      .addSelect('COUNT(*)', 'sessions')
      .addSelect('SUM(log.timeSpent)', 'totalTime')
      .addSelect('AVG(log.quizScore)', 'avgScore')
      .groupBy('log.contentId')
      .orderBy('sessions', 'DESC')
      .limit(10)
      .getRawMany();

    // Get daily activity trends
    const dailyActivity = await query
      .select('DATE(log.timestamp)', 'date')
      .addSelect('COUNT(*)', 'sessions')
      .addSelect('COUNT(DISTINCT log.deviceId)', 'uniqueDevices')
      .addSelect('COUNT(DISTINCT log.studentId)', 'uniqueStudents')
      .addSelect('SUM(log.timeSpent)', 'totalTime')
      .groupBy('DATE(log.timestamp)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      hubId,
      totalSessions,
      totalTimeSpent: parseInt(timeSpentResult.totalTime) || 0,
      averageTimeSpent: parseFloat(timeSpentResult.avgTime) || 0,
      hubDevices,
      activeHubDevices,
      hubStudents,
      activeHubStudents,
      uniqueDevicesUsed: parseInt(uniqueDevicesResult.count) || 0,
      uniqueStudentsActive: parseInt(uniqueStudentsResult.count) || 0,
      topContent,
      dailyActivity,
    };
  }

  /**
   * Validate analytics event structure
   */
  private validateAnalyticsEvent(data: {
    deviceId?: string;
    studentId?: string;
    sessionId: string;
    contentId: string;
    timeSpent: number;
    quizScore?: number;
    moduleCompleted: boolean;
    timestamp?: Date;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required fields
    if (!data.sessionId || data.sessionId.trim().length === 0) {
      errors.push('sessionId is required and cannot be empty');
    }

    if (!data.contentId || data.contentId.trim().length === 0) {
      errors.push('contentId is required and cannot be empty');
    } else if (!this.isValidUUID(data.contentId)) {
      errors.push('contentId must be a valid UUID format');
    }

    // Validate timeSpent
    if (typeof data.timeSpent !== 'number' || data.timeSpent < 0) {
      errors.push('timeSpent must be a non-negative number');
    }

    if (data.timeSpent > 86400) { // More than 24 hours seems unrealistic
      errors.push('timeSpent cannot exceed 86400 seconds (24 hours)');
    }

    // Validate quizScore if provided
    if (data.quizScore !== undefined && data.quizScore !== null) {
      if (typeof data.quizScore !== 'number' || data.quizScore < 0 || data.quizScore > 100) {
        errors.push('quizScore must be a number between 0 and 100');
      }
    }

    // Validate moduleCompleted
    if (typeof data.moduleCompleted !== 'boolean') {
      errors.push('moduleCompleted must be a boolean value');
    }

    // Validate timestamp if provided
    if (data.timestamp && !(data.timestamp instanceof Date)) {
      errors.push('timestamp must be a valid Date object');
    }

    // Validate deviceId format if provided
    if (data.deviceId) {
      if (typeof data.deviceId !== 'string' || data.deviceId.trim().length === 0) {
        errors.push('deviceId must be a non-empty string if provided');
      } else if (!this.isValidUUID(data.deviceId)) {
        errors.push('deviceId must be a valid UUID format if provided');
      }
    }

    // Validate studentId format if provided
    if (data.studentId) {
      if (typeof data.studentId !== 'string' || data.studentId.trim().length === 0) {
        errors.push('studentId must be a non-empty string if provided');
      } else if (!this.isValidUUID(data.studentId)) {
        errors.push('studentId must be a valid UUID format if provided');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Process and aggregate analytics data
   */
  private processAnalyticsData(analyticsData: any[]): {
    validEvents: any[];
    invalidEvents: Array<{ data: any; errors: string[] }>;
    summary: {
      totalEvents: number;
      validEvents: number;
      invalidEvents: number;
      totalTimeSpent: number;
      uniqueSessions: number;
      uniqueDevices: number;
      uniqueStudents: number;
    };
  } {
    const validEvents: any[] = [];
    const invalidEvents: Array<{ data: any; errors: string[] }> = [];
    const uniqueSessions = new Set<string>();
    const uniqueDevices = new Set<string>();
    const uniqueStudents = new Set<string>();
    let totalTimeSpent = 0;

    for (const data of analyticsData) {
      const validation = this.validateAnalyticsEvent(data);
      
      if (validation.isValid) {
        validEvents.push(data);
        totalTimeSpent += data.timeSpent;
        uniqueSessions.add(data.sessionId);
        
        if (data.deviceId) {
          uniqueDevices.add(data.deviceId);
        }
        
        if (data.studentId) {
          uniqueStudents.add(data.studentId);
        }
      } else {
        invalidEvents.push({
          data,
          errors: validation.errors,
        });
      }
    }

    return {
      validEvents,
      invalidEvents,
      summary: {
        totalEvents: analyticsData.length,
        validEvents: validEvents.length,
        invalidEvents: invalidEvents.length,
        totalTimeSpent,
        uniqueSessions: uniqueSessions.size,
        uniqueDevices: uniqueDevices.size,
        uniqueStudents: uniqueStudents.size,
      },
    };
  }

  /**
   * Collect analytics data from edge hub with validation and processing
   */
  async collectAnalyticsFromHub(hubId: string, analyticsData: {
    deviceId?: string;
    studentId?: string;
    sessionId: string;
    contentId: string;
    timeSpent: number;
    quizScore?: number;
    moduleCompleted: boolean;
    timestamp?: Date;
  }[]) {
    // Validate hub exists
    const hub = await this.edgeHubRepository.findOne({ where: { hubId } });
    if (!hub) {
      throw new Error('Hub not found');
    }

    // Process and validate analytics data
    const processed = this.processAnalyticsData(analyticsData);

    // If there are invalid events, log them but continue with valid ones
    if (processed.invalidEvents.length > 0) {
      console.warn(`Analytics validation warnings for hub ${hubId}:`, {
        invalidEvents: processed.invalidEvents,
        summary: processed.summary,
      });
    }

    // Only save valid events
    if (processed.validEvents.length > 0) {
      const activityLogs = processed.validEvents.map(data => 
        this.activityLogRepository.create({
          hubId,
          deviceId: data.deviceId || null,
          studentId: data.studentId || null,
          sessionId: data.sessionId,
          contentId: data.contentId,
          timeSpent: data.timeSpent,
          quizScore: data.quizScore || null,
          moduleCompleted: data.moduleCompleted,
          timestamp: data.timestamp || new Date(),
        })
      );

      const savedLogs = await this.activityLogRepository.save(activityLogs);

      return {
        savedEvents: savedLogs,
        summary: processed.summary,
        invalidEvents: processed.invalidEvents,
      };
    }

    return {
      savedEvents: [],
      summary: processed.summary,
      invalidEvents: processed.invalidEvents,
    };
  }

  /**
   * Get analytics data quality metrics
   */
  async getDataQualityMetrics(hubId?: string): Promise<{
    totalEvents: number;
    eventsWithDeviceId: number;
    eventsWithStudentId: number;
    eventsWithBothIds: number;
    averageTimeSpent: number;
    completionRate: number;
    dataQualityScore: number;
  }> {
    let query = this.activityLogRepository.createQueryBuilder('log');
    
    if (hubId) {
      query = query.where('log.hubId = :hubId', { hubId });
    }

    const totalEvents = await query.getCount();
    
    const eventsWithDeviceId = await query
      .clone()
      .andWhere('log.deviceId IS NOT NULL')
      .getCount();

    const eventsWithStudentId = await query
      .clone()
      .andWhere('log.studentId IS NOT NULL')
      .getCount();

    const eventsWithBothIds = await query
      .clone()
      .andWhere('log.deviceId IS NOT NULL')
      .andWhere('log.studentId IS NOT NULL')
      .getCount();

    const avgTimeResult = await query
      .clone()
      .select('AVG(log.timeSpent)', 'avgTime')
      .getRawOne();

    const completionResult = await query
      .clone()
      .select('COUNT(CASE WHEN log.moduleCompleted = true THEN 1 END) * 100.0 / COUNT(*)', 'rate')
      .getRawOne();

    const averageTimeSpent = parseFloat(avgTimeResult.avgTime) || 0;
    const completionRate = parseFloat(completionResult.rate) || 0;

    // Calculate data quality score (0-100)
    const deviceIdScore = totalEvents > 0 ? (eventsWithDeviceId / totalEvents) * 30 : 0;
    const studentIdScore = totalEvents > 0 ? (eventsWithStudentId / totalEvents) * 30 : 0;
    const bothIdsScore = totalEvents > 0 ? (eventsWithBothIds / totalEvents) * 20 : 0;
    const completionScore = completionRate > 0 ? Math.min(completionRate / 100 * 20, 20) : 0;

    const dataQualityScore = Math.round(deviceIdScore + studentIdScore + bothIdsScore + completionScore);

    return {
      totalEvents,
      eventsWithDeviceId,
      eventsWithStudentId,
      eventsWithBothIds,
      averageTimeSpent,
      completionRate,
      dataQualityScore,
    };
  }
}