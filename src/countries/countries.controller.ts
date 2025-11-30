import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CountriesService } from './countries.service';

@ApiTags('Countries')
@Controller('countries')
export class CountriesController {
  constructor(private countriesService: CountriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all supported countries' })
  @ApiResponse({ 
    status: 200, 
    description: 'Countries retrieved successfully',
    example: [{
      code: 'KE',
      name: 'Kenya',
      continent: 'Africa'
    }, {
      code: 'UG',
      name: 'Uganda',
      continent: 'Africa'
    }]
  })
  async getAllCountries() {
    return this.countriesService.getAllCountries();
  }

  @Post('seed')
  @ApiOperation({ summary: 'Seed countries database with initial data' })
  @ApiResponse({ 
    status: 201, 
    description: 'Countries seeded successfully',
    example: {
      message: 'Countries seeded successfully',
      count: 54
    }
  })
  async seedCountries() {
    return this.countriesService.seedCountries();
  }
}