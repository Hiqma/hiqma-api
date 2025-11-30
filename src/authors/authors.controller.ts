import { Controller, Get, Post, Put, Delete, Body, Param, Query, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { AuthorsService } from './authors.service';

class CreateAuthorDto {
  name: string;
  bio?: string;
  nationality?: string;
  birthYear?: number;
}

@ApiTags('Authors')
@Controller('authors')
export class AuthorsController {
  constructor(private authorsService: AuthorsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all authors' })
  @ApiResponse({ 
    status: 200, 
    description: 'Authors retrieved successfully',
    example: [{
      id: 'author-123',
      name: 'Ngugi wa Thiong\'o',
      bio: 'Kenyan author and academic',
      nationality: 'Kenyan',
      birthYear: 1938,
      createdAt: '2025-01-01T00:00:00.000Z'
    }]
  })
  async getAllAuthors() {
    return this.authorsService.getAllAuthors();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search authors with pagination' })
  @ApiResponse({ 
    status: 200, 
    description: 'Authors search results',
    example: {
      data: [{
        id: 'author-123',
        name: 'Ngugi wa Thiong\'o',
        bio: 'Kenyan author and academic',
        nationality: 'Kenyan',
        birthYear: 1938,
        createdAt: '2025-01-01T00:00:00.000Z'
      }],
      total: 1,
      page: 1,
      totalPages: 1
    }
  })
  async searchAuthors(
    @Query('search') search?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.authorsService.searchAuthors(search, page, limit);
  }

  @Post()
  @ApiOperation({ summary: 'Create new author' })
  @ApiBody({ 
    type: CreateAuthorDto,
    examples: {
      example1: {
        summary: 'Create author',
        value: {
          name: 'Chinua Achebe',
          bio: 'Nigerian novelist and critic',
          nationality: 'Nigerian',
          birthYear: 1930
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Author created successfully',
    example: {
      id: 'author-456',
      name: 'Chinua Achebe',
      bio: 'Nigerian novelist and critic',
      nationality: 'Nigerian',
      birthYear: 1930,
      createdAt: '2025-01-01T00:00:00.000Z'
    }
  })
  async createAuthor(@Body() authorData: CreateAuthorDto) {
    return this.authorsService.createAuthor(authorData);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update author' })
  @ApiParam({ name: 'id', description: 'Author ID' })
  @ApiBody({ type: CreateAuthorDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Author updated successfully'
  })
  async updateAuthor(@Param('id') id: string, @Body() authorData: Partial<CreateAuthorDto>) {
    try {
      return await this.authorsService.updateAuthor(id, authorData);
    } catch (error) {
      if (error.message === 'Author not found' || error.message === 'Author not found after update') {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete author' })
  @ApiParam({ name: 'id', description: 'Author ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Author deleted successfully'
  })
  async deleteAuthor(@Param('id') id: string) {
    return this.authorsService.deleteAuthor(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get author statistics' })
  @ApiParam({ name: 'id', description: 'Author ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Author statistics retrieved successfully',
    example: {
      totalBooks: 15,
      publishedWorks: 12,
      yearsActive: 25
    }
  })
  async getAuthorStats(@Param('id') id: string) {
    return this.authorsService.getAuthorStats(id);
  }
}