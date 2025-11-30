import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
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
  async getContentPopularity() {
    return this.analyticsService.getContentPopularity();
  }

  @Get('advanced')
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
}