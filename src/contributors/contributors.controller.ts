import { Controller, Get, Post, Put, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContributorsService } from './contributors.service';

class SubmitApplicationDto {
  name: string;
  email: string;
  institution: string;
  expertise: string;
  motivation: string;
}

class ReviewApplicationDto {
  status: 'approved' | 'rejected';
  reviewerId: string | null;
}

@ApiTags('Contributors')
@Controller('contributors')
export class ContributorsController {
  constructor(private contributorsService: ContributorsService) {}

  @Post('apply')
  @ApiOperation({ summary: 'Submit contributor application' })
  @ApiBody({ 
    type: SubmitApplicationDto,
    examples: {
      example1: {
        summary: 'Teacher application',
        value: {
          name: 'Jane Doe',
          email: 'jane.doe@school.edu',
          institution: 'Nairobi Primary School',
          expertise: 'Mathematics and Science Education',
          motivation: 'I want to create engaging content for African students'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Application submitted successfully',
    example: {
      id: 'app-123',
      name: 'Jane Doe',
      status: 'pending',
      submittedAt: '2025-01-01T00:00:00.000Z'
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Email already exists or invalid data'
  })
  async submitApplication(@Body() applicationData: SubmitApplicationDto) {
    try {
      return await this.contributorsService.submitApplication(applicationData);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('applications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending contributor applications' })
  @ApiResponse({ 
    status: 200, 
    description: 'Applications retrieved successfully',
    example: [{
      id: 'app-123',
      name: 'Jane Doe',
      email: 'jane.doe@school.edu',
      institution: 'Nairobi Primary School',
      status: 'pending',
      submittedAt: '2025-01-01T00:00:00.000Z'
    }]
  })
  async getPendingApplications() {
    return this.contributorsService.getPendingApplications();
  }

  @Put('applications/:id/review')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Review contributor application' })
  @ApiBody({ 
    type: ReviewApplicationDto,
    examples: {
      example1: {
        summary: 'Approve application',
        value: {
          status: 'approved',
          reviewerId: 'reviewer-123'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Application reviewed successfully',
    example: {
      id: 'app-123',
      status: 'approved',
      reviewedAt: '2025-01-01T00:00:00.000Z',
      reviewerId: 'reviewer-123'
    }
  })
  async reviewApplication(
    @Param('id') id: string,
    @Body() data: ReviewApplicationDto
  ) {
    return this.contributorsService.reviewApplication(id, data.status, data.reviewerId);
  }
}