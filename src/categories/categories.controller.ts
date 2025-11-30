import { Controller, Get, Post, Put, Delete, Body, Param, Query, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';

class CreateCategoryDto {
  name: string;
  description?: string;
  parentId?: string;
}

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ 
    status: 200, 
    description: 'Categories retrieved successfully'
  })
  async getAllCategories() {
    return this.categoriesService.getAllCategories();
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get category tree structure' })
  @ApiResponse({ 
    status: 200, 
    description: 'Category tree retrieved successfully'
  })
  async getCategoryTree() {
    return this.categoriesService.getCategoryTree();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search categories with pagination' })
  @ApiResponse({ 
    status: 200, 
    description: 'Categories search results'
  })
  async searchCategories(
    @Query('search') search?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.categoriesService.searchCategories(search, page, limit);
  }

  @Post()
  @ApiOperation({ summary: 'Create new category' })
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Category created successfully'
  })
  async createCategory(@Body() categoryData: CreateCategoryDto) {
    return this.categoriesService.createCategory(categoryData);
  }

  @Post('seed')
  @ApiOperation({ summary: 'Seed default categories' })
  @ApiResponse({ 
    status: 201, 
    description: 'Categories seeded successfully'
  })
  async seedCategories() {
    return this.categoriesService.seedCategories();
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Category updated successfully'
  })
  async updateCategory(@Param('id') id: string, @Body() categoryData: Partial<CreateCategoryDto>) {
    try {
      return await this.categoriesService.updateCategory(id, categoryData);
    } catch (error) {
      if (error.message === 'Category not found' || error.message === 'Category not found after update') {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Category deleted successfully'
  })
  async deleteCategory(@Param('id') id: string) {
    try {
      return await this.categoriesService.deleteCategory(id);
    } catch (error) {
      if (error.message === 'Category not found') {
        throw new NotFoundException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }
}