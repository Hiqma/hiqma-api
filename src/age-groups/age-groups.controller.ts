import { Controller, Get, Post, Body } from '@nestjs/common';
import { AgeGroupsService } from './age-groups.service';
import { AgeGroup } from '../database/entities';

@Controller('age-groups')
export class AgeGroupsController {
  constructor(private readonly ageGroupsService: AgeGroupsService) {}

  @Get()
  async getAllAgeGroups() {
    return this.ageGroupsService.getAllAgeGroups();
  }

  @Post()
  async createAgeGroup(@Body() ageGroupData: Partial<AgeGroup>) {
    return this.ageGroupsService.createAgeGroup(ageGroupData);
  }

  @Post('seed')
  async seedAgeGroups() {
    return this.ageGroupsService.seedAgeGroups();
  }
}