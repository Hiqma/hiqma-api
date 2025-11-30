import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, IsNull, DataSource } from 'typeorm';
import { Category } from '../database/entities';
import { seedCategories } from '../database/seeds/categories.seed';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private dataSource: DataSource,
  ) {}

  async getAllCategories() {
    return this.categoryRepository.find({
      relations: ['parent', 'children'],
      order: { name: 'ASC' },
    });
  }

  async getCategoryTree() {
    const rootCategories = await this.categoryRepository.find({
      where: { parentId: IsNull() },
      relations: ['children', 'children.children', 'children.children.children'],
      order: { name: 'ASC' },
    });
    return rootCategories;
  }

  async createCategory(categoryData: Partial<Category>) {
    if (categoryData.parentId) {
      const parent = await this.categoryRepository.findOne({ 
        where: { id: categoryData.parentId } 
      });
      if (parent) {
        categoryData.level = parent.level + 1;
      }
    }
    
    const category = this.categoryRepository.create(categoryData);
    return this.categoryRepository.save(category);
  }

  async getCategoryById(id: string) {
    return this.categoryRepository.findOne({ 
      where: { id },
      relations: ['parent', 'children']
    });
  }

  async updateCategory(id: string, categoryData: Partial<Category>) {
    const existingCategory = await this.categoryRepository.findOne({ where: { id } });
    if (!existingCategory) {
      throw new Error('Category not found');
    }

    if (categoryData.parentId && categoryData.parentId !== existingCategory.parentId) {
      const parent = await this.categoryRepository.findOne({ 
        where: { id: categoryData.parentId } 
      });
      if (parent) {
        categoryData.level = parent.level + 1;
      }
    }

    const updateResult = await this.categoryRepository.update(id, categoryData);
    
    if (updateResult.affected === 0) {
      throw new Error('Failed to update category');
    }

    const updatedCategory = await this.categoryRepository.findOne({ 
      where: { id },
      relations: ['parent', 'children']
    });
    if (!updatedCategory) {
      throw new Error('Category not found after update');
    }

    return updatedCategory;
  }

  async deleteCategory(id: string) {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['children']
    });
    
    if (!category) {
      throw new Error('Category not found');
    }

    if (category.children && category.children.length > 0) {
      throw new Error('Cannot delete category with subcategories');
    }

    const result = await this.categoryRepository.delete(id);
    return { deleted: result.affected > 0 };
  }

  async searchCategories(search?: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const whereCondition = search ? [
      { name: ILike(`%${search}%`) },
      { description: ILike(`%${search}%`) }
    ] : {};

    const [categories, total] = await this.categoryRepository.findAndCount({
      where: whereCondition,
      relations: ['parent'],
      order: { name: 'ASC' },
      skip,
      take: limit,
    });

    return {
      data: categories,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async seedCategories() {
    await seedCategories(this.dataSource);
    return { message: 'Categories seeded successfully' };
  }
}