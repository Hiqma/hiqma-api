import { Controller, Get, Post, Query, Param, Body, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth, ApiBody, ApiSecurity } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FlexibleAuthGuard } from '../auth/flexible-auth.guard';
import type { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { AdvancedAnalyticsService } from './advanced-analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private analyticsService: AnalyticsService,
    private advancedAnalyticsService: AdvancedAnalyticsService,
  ) {}

  @Get('engagement')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user engagement statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Engagement stats retrieved successfully',
    example: {
      totalSessions: 1500,
      avgSessionDuration: 420,
      completionRate: 78.5,
      activeUsers: 250
    }
  })
  async getEngagementStats() {
    return this.analyticsService.getEngagementStats();
  }

  @Get('content-popularity')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getContentPopularity() {
    return this.analyticsService.getContentPopularity();
  }

  @Get('advanced')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get advanced analytics dashboard data' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to analyze (default: 30)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Advanced analytics retrieved successfully',
    example: {
      contentPerformance: [{ id: 'content-1', totalSessions: 100, avgTimeSpent: 300 }],
      learningTrends: [{ date: '2025-01-01', uniqueSessions: 50, completions: 35 }],
      hubAnalytics: [{ hubId: 'hub-1', uniqueUsers: 25, totalSessions: 150 }],
      engagementMetrics: { totalContent: 200, completionRate: 75.5 }
    }
  })
  async getAdvancedAnalytics(@Query('days') days?: string) {
    const dayCount = days ? parseInt(days) : 30;
    const [performance, trends, hubs, subjects, engagement] = await Promise.all([
      this.advancedAnalyticsService.getContentPerformance(),
      this.advancedAnalyticsService.getLearningTrends(dayCount),
      this.advancedAnalyticsService.getHubAnalytics(),
      this.advancedAnalyticsService.getSubjectAnalytics(),
      this.advancedAnalyticsService.getEngagementMetrics(),
    ]);

    return {
      contentPerformance: performance,
      learningTrends: trends,
      hubAnalytics: hubs,
      subjectAnalytics: subjects,
      engagementMetrics: engagement,
    };
  }

  @Get('export')
  @ApiOperation({ summary: 'Export analytics data' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'json'], description: 'Export format' })
  @ApiResponse({ 
    status: 200, 
    description: 'Analytics data exported successfully'
  })
  async exportAnalytics(
    @Query('format') format: 'csv' | 'json' = 'json',
    @Res() res: Response,
  ) {
    const data = await this.advancedAnalyticsService.exportAnalytics(format);
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=hiqma-analytics.csv');
      res.send(data);
    } else {
      res.json(data);
    }
  }

  @Get('enhanced-engagement')
  @ApiOperation({ summary: 'Get enhanced engagement statistics with device and student tracking' })
  @ApiResponse({ 
    status: 200, 
    description: 'Enhanced engagement stats retrieved successfully',
    example: {
      totalContent: 200,
      totalUsers: 50,
      totalDevices: 25,
      totalStudents: 150,
      activeDevices: 20,
      activeStudents: 120,
      uniqueDevicesUsed: 18,
      uniqueStudentsActive: 95,
      edgeHubs: 3,
      totalSessions: 1500,
      completionRate: 78.5
    }
  })
  async getEnhancedEngagementStats() {
    return this.analyticsService.getEnhancedEngagementStats();
  }

  @Get('devices/:deviceId')
  @ApiOperation({ summary: 'Get device-specific analytics' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for analytics (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for analytics (ISO string)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Device analytics retrieved successfully',
    example: {
      deviceId: 'device-123',
      totalSessions: 45,
      totalTimeSpent: 12600,
      averageTimeSpent: 280,
      completionRate: 82.2,
      contentUsage: [
        { contentId: 'content-1', sessions: 15, totalTime: 4200 }
      ],
      studentUsage: [
        { studentId: 'student-1', sessions: 10, totalTime: 2800 }
      ]
    }
  })
  async getDeviceAnalytics(
    @Param('deviceId') deviceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate),
    } : undefined;

    return this.analyticsService.getDeviceAnalytics(deviceId, dateRange);
  }

  @Get('students/:studentId')
  @ApiOperation({ summary: 'Get student-specific analytics' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for analytics (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for analytics (ISO string)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Student analytics retrieved successfully',
    example: {
      studentId: 'student-123',
      totalSessions: 32,
      totalTimeSpent: 9600,
      averageTimeSpent: 300,
      completionRate: 87.5,
      contentProgress: [
        { contentId: 'content-1', sessions: 8, totalTime: 2400, avgQuizScore: 85, completed: true }
      ],
      deviceUsage: [
        { deviceId: 'device-1', sessions: 20, totalTime: 6000 }
      ],
      learningProgression: [
        { date: '2025-01-01', sessions: 3, timeSpent: 900, avgScore: 82 }
      ]
    }
  })
  async getStudentAnalytics(
    @Param('studentId') studentId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate),
    } : undefined;

    return this.analyticsService.getStudentAnalytics(studentId, dateRange);
  }

  @Get('hubs/:hubId')
  @ApiOperation({ summary: 'Get hub-level analytics with device and student breakdown' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for analytics (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for analytics (ISO string)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Hub analytics retrieved successfully',
    example: {
      hubId: 'hub-123',
      totalSessions: 500,
      totalTimeSpent: 150000,
      averageTimeSpent: 300,
      hubDevices: 10,
      activeHubDevices: 8,
      hubStudents: 50,
      activeHubStudents: 45,
      uniqueDevicesUsed: 7,
      uniqueStudentsActive: 38,
      topContent: [
        { contentId: 'content-1', sessions: 100, totalTime: 30000, avgScore: 85 }
      ],
      dailyActivity: [
        { date: '2025-01-01', sessions: 25, uniqueDevices: 5, uniqueStudents: 15, totalTime: 7500 }
      ]
    }
  })
  async getHubAnalytics(
    @Param('hubId') hubId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate),
    } : undefined;

    return this.analyticsService.getHubAnalytics(hubId, dateRange);
  }

  @Post('hubs/:hubId/collect')
  @UseGuards(FlexibleAuthGuard)
  @ApiSecurity('api-key')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Collect analytics data from edge hub' })
  @ApiResponse({ 
    status: 201, 
    description: 'Analytics data collected successfully'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        analyticsData: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              deviceId: { type: 'string', nullable: true },
              studentId: { type: 'string', nullable: true },
              sessionId: { type: 'string' },
              contentId: { type: 'string' },
              timeSpent: { type: 'number' },
              quizScore: { type: 'number', nullable: true },
              moduleCompleted: { type: 'boolean' },
              timestamp: { type: 'string', format: 'date-time', nullable: true }
            }
          }
        }
      }
    },
    examples: {
      example1: {
        summary: 'Collect analytics with device and student attribution',
        value: {
          analyticsData: [
            {
              deviceId: 'device-123',
              studentId: 'student-456',
              sessionId: 'session-789',
              contentId: 'content-abc',
              timeSpent: 300,
              quizScore: 85,
              moduleCompleted: true,
              timestamp: '2025-01-15T10:30:00Z'
            }
          ]
        }
      }
    }
  })
  async collectAnalytics(
    @Param('hubId') hubId: string,
    @Body() body: {
      analyticsData: Array<{
        deviceId?: string;
        studentId?: string;
        sessionId: string;
        contentId: string;
        timeSpent: number;
        quizScore?: number;
        moduleCompleted: boolean;
        timestamp?: string;
      }>;
    },
  ) {
    const processedData = body.analyticsData.map(data => ({
      ...data,
      timestamp: data.timestamp ? new Date(data.timestamp) : undefined,
    }));

    const result = await this.analyticsService.collectAnalyticsFromHub(hubId, processedData);
    
    return {
      message: 'Analytics data collected successfully',
      recordsProcessed: result.savedEvents?.length || 0,
      summary: result.summary,
      invalidEvents: result.invalidEvents,
    };
  }

  @Get('data-quality')
  @ApiOperation({ summary: 'Get analytics data quality metrics' })
  @ApiQuery({ name: 'hubId', required: false, description: 'Filter by specific hub ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Data quality metrics retrieved successfully',
    example: {
      totalEvents: 1500,
      eventsWithDeviceId: 1200,
      eventsWithStudentId: 900,
      eventsWithBothIds: 800,
      averageTimeSpent: 285.5,
      completionRate: 78.2,
      dataQualityScore: 85
    }
  })
  async getDataQualityMetrics(@Query('hubId') hubId?: string) {
    return this.analyticsService.getDataQualityMetrics(hubId);
  }

  @Get('enhanced')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get enhanced analytics with comprehensive metrics' })
  @ApiQuery({ name: 'hubId', required: false, description: 'Filter by specific hub ID' })
  @ApiQuery({ name: 'deviceId', required: false, description: 'Filter by specific device ID' })
  @ApiQuery({ name: 'studentId', required: false, description: 'Filter by specific student ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for analytics (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for analytics (ISO string)' })
  @ApiQuery({ name: 'contentId', required: false, description: 'Filter by specific content ID' })
  @ApiQuery({ name: 'grade', required: false, description: 'Filter by student grade' })
  @ApiResponse({ 
    status: 200, 
    description: 'Enhanced analytics retrieved successfully'
  })
  async getEnhancedAnalytics(
    @Query('hubId') hubId?: string,
    @Query('deviceId') deviceId?: string,
    @Query('studentId') studentId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('contentId') contentId?: string,
    @Query('grade') grade?: string,
  ) {
    console.log('getEnhancedAnalytics - Query params:', { hubId, deviceId, studentId, startDate, endDate, contentId, grade });
    
    const dateRange = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate + 'T23:59:59.999Z'), // Include the entire end date
    } : undefined;
    
    console.log('getEnhancedAnalytics - Parsed dateRange:', dateRange);

    // Get overview stats
    const engagementStats = await this.analyticsService.getEnhancedEngagementStats();
    
    // Get content performance
    const contentPerformance = await this.advancedAnalyticsService.getContentPerformance();
    
    // Get engagement trends
    const engagementTrends = await this.advancedAnalyticsService.getLearningTrends(30);
    
    // Get hub analytics if hubId is provided
    let hubAnalytics = [];
    if (hubId) {
      const hubData = await this.analyticsService.getHubAnalytics(hubId, dateRange);
      hubAnalytics = [hubData];
    } else {
      hubAnalytics = await this.advancedAnalyticsService.getHubAnalytics();
    }

    // Get device analytics if deviceId is provided
    let deviceAnalytics = [];
    if (deviceId) {
      const deviceData = await this.analyticsService.getDeviceAnalytics(deviceId, dateRange);
      deviceAnalytics = [deviceData];
    }

    // Get student analytics if studentId is provided
    let studentAnalytics = [];
    if (studentId) {
      const studentData = await this.analyticsService.getStudentAnalytics(studentId, dateRange);
      studentAnalytics = [studentData];
    }

    // Calculate totalTimeSpent and avgQuizScore from activity logs
    const timeAndScoreStats = await this.analyticsService.getTotalTimeAndAvgScore(dateRange);
    
    console.log('getEnhancedAnalytics - timeAndScoreStats:', timeAndScoreStats);

    return {
      overview: {
        totalSessions: engagementStats.totalSessions,
        totalDevices: engagementStats.totalDevices,
        totalStudents: engagementStats.totalStudents,
        totalTimeSpent: timeAndScoreStats.totalTimeSpent,
        completionRate: engagementStats.completionRate,
        avgQuizScore: timeAndScoreStats.avgQuizScore,
      },
      deviceAnalytics,
      studentAnalytics,
      contentPerformance,
      engagementTrends,
      hubAnalytics,
    };
  }

  @Get('reading-progress-trends')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get reading progress trends over time' })
  @ApiQuery({ name: 'hubId', required: false, description: 'Filter by specific hub ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for analytics (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for analytics (ISO string)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Reading progress trends retrieved successfully'
  })
  async getReadingProgressTrends(
    @Query('hubId') hubId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Use learning trends as reading progress trends
    const days = startDate && endDate ? 
      Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) : 
      30;
    
    const trends = await this.advancedAnalyticsService.getLearningTrends(days);
    
    // Transform to match expected format
    return trends.map(trend => ({
      period: trend.date,
      sessions: trend.uniqueSessions || 0,
      completions: trend.completions || 0,
      avgTime: trend.avgTimeSpent || 0,
      avgScore: trend.avgQuizScore || 0,
    }));
  }
}