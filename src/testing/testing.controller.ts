import { Controller, Post, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.guard';
import { TestDataService } from './test-data.service';

@ApiTags('Testing')
@Controller('testing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
@ApiBearerAuth()
export class TestingController {
  constructor(private readonly testDataService: TestDataService) {}

  @Post('seed')
  @ApiOperation({ summary: 'Seed database with test data (Super Admin only)' })
  @ApiResponse({ 
    status: 201, 
    description: 'Test data seeded successfully',
    example: {
      message: 'Test data seeded successfully',
      users: 1,
      authors: 1,
      countries: 1,
      content: 1
    }
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - Super admin access required'
  })
  async seedTestData() {
    return this.testDataService.seedTestData();
  }

  @Delete('clear')
  @ApiOperation({ summary: 'Clear all test data from database (Super Admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Test data cleared successfully',
    example: {
      message: 'Test data cleared successfully'
    }
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - Super admin access required'
  })
  async clearTestData() {
    return this.testDataService.clearTestData();
  }
}