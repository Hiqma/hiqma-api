import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

class LoginDto {
  email: string;
  password: string;
}

class RegisterDto {
  email: string;
  password: string;
  role: 'student' | 'moderator' | 'hub_manager';
  country: string;
  continent: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ 
    type: LoginDto,
    examples: {
      example1: {
        summary: 'User login',
        value: {
          email: 'user@example.com',
          password: 'password123'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    example: {
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      user: {
        id: 'user-123',
        email: 'user@example.com',
        role: 'contributor'
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Invalid credentials'
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Post('register')
  @ApiOperation({ summary: 'User registration' })
  @ApiBody({ 
    type: RegisterDto,
    examples: {
      example1: {
        summary: 'New user registration',
        value: {
          email: 'newuser@example.com',
          password: 'securepassword',
          role: 'contributor',
          country: 'Kenya',
          continent: 'Africa'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'User registered successfully',
    example: {
      id: 'user-456',
      email: 'newuser@example.com',
      role: 'contributor',
      country: 'Kenya',
      createdAt: '2025-01-01T00:00:00.000Z'
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Registration failed - user already exists or invalid data'
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({ 
    status: 200, 
    description: 'Current user retrieved successfully',
    example: {
      id: 'user-123',
      email: 'user@example.com',
      role: 'super_admin',
      name: 'John Doe',
      createdAt: '2025-01-01T00:00:00.000Z'
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - invalid or missing token'
  })
  async getCurrentUser(@Request() req: any) {
    return this.authService.getUserById(req.user.userId);
  }
}