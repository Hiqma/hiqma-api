import { Controller, Get, Put, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

class ChangePasswordDto {
  newPassword: string;
}

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getUsers() {
    return this.usersService.getUsers();
  }

  @Get('contributors')
  @ApiOperation({ summary: 'Get all contributors' })
  @ApiResponse({ 
    status: 200, 
    description: 'Contributors retrieved successfully',
    example: [{
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com'
    }]
  })
  async getContributors() {
    return this.usersService.getContributors();
  }

  @Get('profile/:id')
  @ApiOperation({ summary: 'Get user profile with authored content' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getUserProfile(@Param('id') id: string) {
    return this.usersService.getUserProfile(id);
  }

  @Put(':id/password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(@Param('id') id: string, @Body() data: ChangePasswordDto) {
    try {
      return await this.usersService.changePassword(id, data.newPassword);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}