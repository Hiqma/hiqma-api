import { Controller, Get, Post, Query, Param, Body, Res, UseGuards, SetMetadata } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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
  @SetMetadata('isPublic', true) // Mark this endpoint as public for edge hub access
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
}