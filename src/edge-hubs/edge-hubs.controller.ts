import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FlexibleAuthGuard } from '../auth/flexible-auth.guard';
import { EdgeHubsService } from './edge-hubs.service';
import { StudentsService } from '../students/students.service';
import { AccessContext, AccessControlService } from '../security/access-control.service';

@ApiTags('Edge Hubs')
@Controller('edge-hubs')
@ApiBearerAuth()
export class EdgeHubsController {
  constructor(
    private readonly edgeHubsService: EdgeHubsService,
    private readonly studentsService: StudentsService,
    private readonly accessControlService: AccessControlService,
  ) {}

  /**
   * Create access context from request
   */
  private createAccessContext(req: any): AccessContext {
    const userType = req.user?.role || 'admin';
    const hubId = req.params?.hubId;
    
    // Get permissions based on user type
    const permissions = req.user?.permissions || this.accessControlService.getUserPermissions(userType, hubId);
    
    return {
      userId: req.user?.id,
      userType: userType as any,
      hubId: hubId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      permissions: permissions,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new edge hub' })
  create(@Body() createEdgeHubDto: any) {
    return this.edgeHubsService.create(createEdgeHubDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all edge hubs' })
  findAll() {
    return this.edgeHubsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get edge hub by ID' })
  findOne(@Param('id') id: string) {
    return this.edgeHubsService.findOne(+id);
  }

  @Get(':hubId/content')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get content for a hub with assignment status' })
  @ApiQuery({ name: 'assigned', required: false, description: 'Filter by assignment: true, false, or omit for all' })
  @ApiQuery({ name: 'search', required: false, description: 'Search content by title or description' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  getHubContent(
    @Param('hubId') hubId: string,
    @Query('assigned') assigned?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    const assignedFilter = assigned === 'true' ? true : assigned === 'false' ? false : undefined;
    return this.edgeHubsService.getHubContent(hubId, { 
      assigned: assignedFilter, 
      search, 
      page: page || 1, 
      limit: limit || 10 
    });
  }

  @Post(':hubId/content/:contentId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Assign content to hub' })
  @ApiResponse({ status: 200, description: 'Content assigned successfully' })
  assignContent(@Param('hubId') hubId: string, @Param('contentId') contentId: string) {
    return this.edgeHubsService.assignContentToHub(hubId, contentId);
  }

  @Post(':hubId/content/assign-all')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Assign all available content to hub' })
  @ApiResponse({ status: 200, description: 'All content assigned successfully' })
  assignAllContent(@Param('hubId') hubId: string) {
    return this.edgeHubsService.assignAllContentToHub(hubId);
  }

  @Delete(':hubId/content/:contentId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Unassign content from hub' })
  @ApiResponse({ status: 200, description: 'Content unassigned successfully' })
  unassignContent(@Param('hubId') hubId: string, @Param('contentId') contentId: string) {
    return this.edgeHubsService.unassignContentFromHub(hubId, contentId);
  }

  @Get(':hubId/sync')
  @UseGuards(FlexibleAuthGuard)
  @ApiSecurity('api-key')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get assigned content for hub sync (used by edge hub)' })
  @ApiQuery({ name: 'since', required: false, description: 'ISO timestamp for incremental sync' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns only content assigned to this hub, optionally filtered by update time' 
  })
  getAssignedContent(
    @Param('hubId') hubId: string,
    @Query('since') since?: string
  ) {
    return this.edgeHubsService.getAssignedContent(hubId, since);
  }

  @Get(':hubId/sync-all')
  @UseGuards(FlexibleAuthGuard)
  @ApiSecurity('api-key')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all sync data (content, devices, students) for hub' })
  @ApiQuery({ name: 'since', required: false, description: 'ISO timestamp for incremental sync' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns content, devices, and students for this hub' 
  })
  getSyncData(
    @Param('hubId') hubId: string,
    @Query('since') since?: string
  ) {
    return this.edgeHubsService.getSyncData(hubId, since);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update edge hub' })
  update(@Param('id') id: string, @Body() updateEdgeHubDto: any) {
    return this.edgeHubsService.update(+id, updateEdgeHubDto);
  }

  @Post(':hubId/metrics')
  @UseGuards(FlexibleAuthGuard)
  @ApiSecurity('api-key')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update hub metrics (used by edge hub)' })
  @ApiResponse({ status: 200, description: 'Metrics updated successfully' })
  updateMetrics(
    @Param('hubId') hubId: string,
    @Body() metrics: {
      totalReaders?: number;
      activeReaders?: number;
      totalContent?: number;
      dataTransferred?: number;
    }
  ) {
    return this.edgeHubsService.updateMetrics(hubId, metrics);
  }

  @Get(':hubId/settings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get hub authentication and access settings' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns hub authentication settings',
    schema: {
      type: 'object',
      properties: {
        hubId: { type: 'string' },
        name: { type: 'string' },
        allowAnonymousAccess: { type: 'boolean' },
        requireStudentAuthentication: { type: 'boolean' },
        authenticationMessage: { type: 'string', nullable: true }
      }
    }
  })
  getHubSettings(@Param('hubId') hubId: string) {
    return this.edgeHubsService.getHubSettings(hubId);
  }

  @Patch(':hubId/settings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update hub authentication and access settings' })
  @ApiResponse({ status: 200, description: 'Hub settings updated successfully' })
  updateHubSettings(
    @Param('hubId') hubId: string,
    @Body() settings: {
      allowAnonymousAccess?: boolean;
      requireStudentAuthentication?: boolean;
      authenticationMessage?: string;
    }
  ) {
    return this.edgeHubsService.updateHubSettings(hubId, settings);
  }

  @Post(':hubId/students')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create student for hub' })
  @ApiResponse({ status: 201, description: 'Student created successfully' })
  async createStudent(
    @Param('hubId') hubId: string, 
    @Body() data: {
      firstName?: string;
      lastName?: string;
      grade?: string;
      age?: number;
      metadata?: Record<string, any>;
    },
    @Request() req: any
  ) {
    const context = this.createAccessContext(req);
    return await this.studentsService.createStudent(hubId, data, context);
  }

  @Get(':hubId/students')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all students for hub' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by student status' })
  @ApiQuery({ name: 'search', required: false, description: 'Search students by name or code' })
  @ApiQuery({ name: 'grade', required: false, description: 'Filter by grade' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
  @ApiResponse({ status: 200, description: 'Students retrieved successfully' })
  async getHubStudents(
    @Param('hubId') hubId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('grade') grade?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Request() req?: any
  ) {
    const context = this.createAccessContext(req);
    
    // For now, just return all students - we can add filtering later
    const students = await this.studentsService.getStudentsForHub(hubId, context);
    
    // Simple filtering on the result set
    let filteredStudents = students;
    
    if (status) {
      filteredStudents = filteredStudents.filter(s => s.status === status);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredStudents = filteredStudents.filter(s => 
        s.firstName?.toLowerCase().includes(searchLower) ||
        s.lastName?.toLowerCase().includes(searchLower) ||
        s.studentCode.toLowerCase().includes(searchLower)
      );
    }
    
    if (grade) {
      filteredStudents = filteredStudents.filter(s => s.grade === grade);
    }
    
    // Simple pagination
    const pageNum = page || 1;
    const limitNum = limit || 10;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    
    const paginatedStudents = filteredStudents.slice(startIndex, endIndex);
    
    return {
      students: paginatedStudents,
      total: filteredStudents.length,
      page: pageNum,
      totalPages: Math.ceil(filteredStudents.length / limitNum)
    };
  }

  @Post(':hubId/students/bulk')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Bulk create students for hub' })
  @ApiResponse({ status: 201, description: 'Students created successfully' })
  async bulkCreateStudents(
    @Param('hubId') hubId: string,
    @Body() data: { students: any[] },
    @Request() req: any
  ) {
    const context = this.createAccessContext(req);
    return await this.studentsService.bulkCreateStudents(hubId, data.students, context);
  }

  @Get(':hubId/students/stats')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get student statistics for hub' })
  @ApiResponse({ status: 200, description: 'Student statistics retrieved successfully' })
  async getHubStudentStats(@Param('hubId') hubId: string) {
    return await this.studentsService.getStudentStatsForHub(hubId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete edge hub' })
  remove(@Param('id') id: string) {
    return this.edgeHubsService.remove(+id);
  }
}