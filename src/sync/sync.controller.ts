import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { SyncService } from './sync.service';

class UploadLogsDto {
  logs: any[];
}

@ApiTags('Synchronization')
@Controller('sync')
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Get('content')
  @ApiOperation({ summary: 'Get verified content and leaderboard for edge hubs' })
  @ApiResponse({ 
    status: 200, 
    description: 'Content and leaderboard retrieved successfully',
    example: {
      content: [{
        id: 'content-123',
        title: 'Sample Story',
        htmlContent: '<h1>Story</h1><p>Content...</p>',
        category: 'Literature',
        language: 'English',
        status: 'verified'
      }],
      leaderboard: [{
        userId: 'user-123',
        name: 'John Doe',
        points: 850,
        rank: 1
      }],
      lastSync: '2025-01-01T00:00:00.000Z'
    }
  })
  async getContent() {
    const content = await this.syncService.getVerifiedContent();
    const leaderboard = await this.syncService.getLeaderboard();
    
    return {
      content,
      leaderboard,
      lastSync: new Date(),
    };
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload activity logs from edge hubs' })
  @ApiBody({ 
    type: UploadLogsDto,
    examples: {
      example1: {
        summary: 'Activity logs upload',
        value: {
          logs: [{
            sessionId: 'session-123',
            contentId: 'content-456',
            userId: 'user-789',
            timeSpent: 300,
            quizScore: 85,
            moduleCompleted: true,
            timestamp: '2025-01-01T00:00:00.000Z'
          }]
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Activity logs uploaded successfully',
    example: {
      message: 'Logs uploaded successfully',
      processed: 1,
      timestamp: '2025-01-01T00:00:00.000Z'
    }
  })
  async uploadActivityLogs(@Body() data: UploadLogsDto) {
    return this.syncService.uploadActivityLogs(data.logs);
  }
}