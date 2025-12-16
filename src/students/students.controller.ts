import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, BadRequestException, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StudentsService } from './students.service';
import { AccessContext } from '../security/access-control.service';

class CreateStudentDto {
  firstName?: string;
  lastName?: string;
  grade?: string;
  age?: number;
  metadata?: Record<string, any>;
}

class UpdateStudentDto {
  firstName?: string;
  lastName?: string;
  grade?: string;
  age?: number;
  metadata?: Record<string, any>;
  status?: 'active' | 'inactive';
}

class BulkCreateStudentsDto {
  students: CreateStudentDto[];
}

class ValidateStudentCodeDto {
  studentCode: string;
}

@ApiTags('Students')
@Controller('students')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  /**
   * Create access context from request
   */
  private createAccessContext(req: any): AccessContext {
    return {
      userId: req.user?.id,
      userType: req.user?.role || 'admin', // Default to admin for authenticated users
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      permissions: req.user?.permissions || [],
    };
  }

  @Post('hubs/:hubId/students')
  @ApiOperation({ summary: 'Create student profile' })
  @ApiResponse({ status: 201, description: 'Student created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid student data or hub not found' })
  @ApiBody({
    type: CreateStudentDto,
    examples: {
      example1: {
        summary: 'Create student with basic info',
        value: {
          firstName: 'John',
          lastName: 'Doe',
          grade: '3rd Grade',
          age: 8
        }
      },
      example2: {
        summary: 'Create student with metadata',
        value: {
          firstName: 'Jane',
          lastName: 'Smith',
          grade: '5th Grade',
          age: 10,
          metadata: {
            readingLevel: 'Advanced',
            interests: ['Science', 'Math']
          }
        }
      }
    }
  })
  async createStudent(@Param('hubId') hubId: string, @Body() data: CreateStudentDto, @Request() req: any) {
    try {
      const context = this.createAccessContext(req);
      return await this.studentsService.createStudent(hubId, data, context);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('hubs/:hubId/students')
  @ApiOperation({ summary: 'Retrieve all students for hub' })
  @ApiResponse({ 
    status: 200, 
    description: 'Students retrieved successfully',
    example: [{
      id: 'student-123',
      hubId: 'hub-456',
      studentCode: 'ABC4',
      firstName: 'John',
      lastName: 'Doe',
      grade: '3rd Grade',
      age: 8,
      status: 'active',
      createdAt: '2023-01-01T00:00:00Z'
    }]
  })
  async getStudentsForHub(@Param('hubId') hubId: string) {
    return await this.studentsService.getStudentsForHub(hubId);
  }

  @Get(':studentId')
  @ApiOperation({ summary: 'Get student by ID' })
  @ApiResponse({ status: 200, description: 'Student retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async getStudent(@Param('studentId') studentId: string) {
    return await this.studentsService.getStudent(studentId);
  }

  @Put(':studentId')
  @ApiOperation({ summary: 'Update student information' })
  @ApiResponse({ status: 200, description: 'Student updated successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  @ApiBody({
    type: UpdateStudentDto,
    examples: {
      example1: {
        summary: 'Update student info',
        value: {
          firstName: 'John',
          lastName: 'Doe',
          grade: '4th Grade',
          age: 9
        }
      }
    }
  })
  async updateStudent(@Param('studentId') studentId: string, @Body() data: UpdateStudentDto) {
    try {
      return await this.studentsService.updateStudent(studentId, data);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete(':studentId')
  @ApiOperation({ summary: 'Deactivate student account' })
  @ApiResponse({ status: 200, description: 'Student deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async deactivateStudent(@Param('studentId') studentId: string) {
    try {
      const student = await this.studentsService.deactivateStudent(studentId);
      return { message: 'Student deactivated successfully', student };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate student code' })
  @ApiResponse({ status: 200, description: 'Student code validation result' })
  @ApiBody({
    type: ValidateStudentCodeDto,
    examples: {
      example1: {
        summary: 'Validate student code',
        value: { studentCode: 'ABC4' }
      }
    }
  })
  async validateStudentCode(@Body() data: ValidateStudentCodeDto) {
    const student = await this.studentsService.validateStudentCode(data.studentCode);
    return {
      valid: !!student,
      student: student || null
    };
  }

  @Post('hubs/:hubId/bulk')
  @ApiOperation({ summary: 'Bulk create students from CSV data' })
  @ApiResponse({ status: 201, description: 'Students created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid bulk data or limits exceeded' })
  @ApiBody({
    type: BulkCreateStudentsDto,
    examples: {
      example1: {
        summary: 'Bulk create students',
        value: {
          students: [
            {
              firstName: 'John',
              lastName: 'Doe',
              grade: '3rd Grade',
              age: 8
            },
            {
              firstName: 'Jane',
              lastName: 'Smith',
              grade: '4th Grade',
              age: 9
            }
          ]
        }
      }
    }
  })
  async bulkCreateStudents(@Param('hubId') hubId: string, @Body() data: BulkCreateStudentsDto) {
    try {
      return await this.studentsService.bulkCreateStudents(hubId, data.students);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get student statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Student statistics retrieved successfully',
    example: {
      totalStudents: 250,
      activeStudents: 230,
      inactiveStudents: 20,
      averageAge: 9.2,
      gradeDistribution: {
        '1st Grade': 45,
        '2nd Grade': 52,
        '3rd Grade': 48,
        '4th Grade': 55,
        '5th Grade': 50
      }
    }
  })
  async getStudentStats() {
    return await this.studentsService.getStudentStats();
  }
}