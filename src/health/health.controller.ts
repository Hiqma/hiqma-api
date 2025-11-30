import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Get overall system health status' })
  @ApiResponse({ 
    status: 200, 
    description: 'System health retrieved successfully',
    example: {
      status: 'healthy',
      timestamp: '2025-01-01T00:00:00.000Z',
      services: {
        database: { healthy: true, message: 'Database connection successful' },
        sync: { healthy: true, message: 'Sync service operational' }
      }
    }
  })
  async getHealth() {
    return this.healthService.getSystemHealth();
  }

  @Get('database')
  @ApiOperation({ summary: 'Check database connectivity' })
  @ApiResponse({ 
    status: 200, 
    description: 'Database health retrieved successfully',
    example: {
      healthy: true,
      message: 'Database connection successful'
    }
  })
  async getDatabaseHealth() {
    return this.healthService.getDatabaseHealth();
  }

  @Get('sync')
  @ApiOperation({ summary: 'Check synchronization service health' })
  @ApiResponse({ 
    status: 200, 
    description: 'Sync health retrieved successfully',
    example: {
      healthy: true,
      message: 'Sync service operational',
      lastSync: '2025-01-01T00:00:00.000Z'
    }
  })
  async getSyncHealth() {
    return this.healthService.getSyncHealth();
  }
}