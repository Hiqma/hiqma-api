import { Controller, Get, Post, Put, Body, Param, UseGuards, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ContentService } from './content.service';

class SubmitContentDto {
  title: string;
  description?: string;
  htmlContent: string;
  authorId?: string[];
  language: string;
  originalLanguage: string;
  categoryId: string[];
  targetCountries: string[];
  ageGroupId: string;
  comprehensionQuestions?: any[];
  images?: string[];
  isAuthor?: boolean;
  authorName?: string;
}

class UpdateStatusDto {
  status: 'verified' | 'rejected';
  reason?: string;
}

@ApiTags('Content')
@Controller('content')
export class ContentController {
  constructor(private contentService: ContentService) {}

  @Get()
  @ApiOperation({ summary: 'Get all content with search and pagination' })
  @ApiQuery({ name: 'country', required: false, description: 'Country code filter' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for title or description' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Content retrieved successfully',
    example: {
      data: [{
        id: 'content-123',
        title: 'Sample Story',
        category: 'Literature',
        language: 'English',
        status: 'verified'
      }],
      total: 1,
      page: 1,
      totalPages: 1
    }
  })
  async getAllContent(
    @Query('country') country?: string,
    @Query('search') search?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Request() req?: any
  ) {
    if (country) {
      return this.contentService.getContentByCountry(country, search, page, limit);
    }
    return this.contentService.getAllContent(search, page, limit);
  }

  @Get('my-content')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('contributor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get content submitted by current user' })
  @ApiResponse({ 
    status: 200, 
    description: 'User content retrieved successfully',
    example: [{
      id: 'content-123',
      title: 'My Story',
      status: 'pending',
      createdAt: '2025-01-01T00:00:00.000Z'
    }]
  })
  async getMyContent(@Request() req: any) {
    return this.contentService.getContentByContributor(req.user.userId);
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all pending content for review' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for title or description' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Pending content retrieved successfully',
    example: {
      data: [{
        id: 'content-456',
        title: 'Pending Story',
        status: 'pending',
        contributorId: 'user-123',
        createdAt: '2025-01-01T00:00:00.000Z'
      }],
      total: 1,
      page: 1,
      totalPages: 1
    }
  })
  async getPendingContent(
    @Query('search') search?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.contentService.getPendingContent(search, page, limit);
  }

  @Post('submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('contributor', 'moderator', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit new content for review' })
  @ApiBody({ 
    type: SubmitContentDto,
    examples: {
      example1: {
        summary: 'Story submission',
        value: {
          title: 'The Clever Hare',
          description: 'A traditional African folktale',
          htmlContent: '<h1>The Clever Hare</h1><p>Once upon a time...</p>',
          authorId: 'author-123',
          language: 'English',
          originalLanguage: 'Swahili',
          category: 'Literature',
          targetCountries: ['KE', 'UG'],
          ageGroup: 'Grade 3-5',
          comprehensionQuestions: [{
            question: 'What did the hare do?',
            type: 'multiple_choice',
            options: ['Ran', 'Jumped', 'Hid'],
            correctAnswer: 'Ran'
          }]
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Content submitted successfully',
    example: {
      id: 'content-456',
      title: 'The Clever Hare',
      status: 'pending'
    }
  })
  async submitContent(@Body() contentData: SubmitContentDto, @Request() req: any) {
    const payload = {
      ...contentData,
      contributorId: req.user?.userId || 'current-user-id',
      targetCountries: JSON.stringify(contentData.targetCountries),
      comprehensionQuestions: JSON.stringify(contentData.comprehensionQuestions || []),
      images: contentData.images ? JSON.stringify(contentData.images) : undefined,
    };
    return this.contentService.submitContent(payload);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get content by ID' })
  async getContentById(@Param('id') id: string) {
    return this.contentService.getContentById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('contributor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update pending content' })
  async updateContent(
    @Param('id') id: string,
    @Body() contentData: SubmitContentDto,
    @Request() req: any
  ) {
    const payload = {
      ...contentData,
      contributorId: req.user?.userId,
      targetCountries: JSON.stringify(contentData.targetCountries),
      comprehensionQuestions: contentData.comprehensionQuestions ? JSON.stringify(contentData.comprehensionQuestions) : undefined,
      images: contentData.images ? JSON.stringify(contentData.images) : undefined,
    };
    return this.contentService.updateContent(id, payload);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update content status' })
  @ApiBody({ 
    type: UpdateStatusDto,
    examples: {
      example1: {
        summary: 'Verify content',
        value: { status: 'verified' }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Status updated successfully',
    example: {
      id: 'content-123',
      status: 'verified',
      updatedAt: '2025-01-01T00:00:00.000Z'
    }
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() data: UpdateStatusDto
  ) {
    return this.contentService.updateContentStatus(id, data.status, data.reason);
  }
}