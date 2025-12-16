import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { EdgeHubsService } from './edge-hubs.service';

@ApiTags('Edge Hubs')
@Controller('edge-hubs')
export class EdgeHubsController {
  constructor(private readonly edgeHubsService: EdgeHubsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new edge hub' })
  create(@Body() createEdgeHubDto: any) {
    return this.edgeHubsService.create(createEdgeHubDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all edge hubs' })
  findAll() {
    return this.edgeHubsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get edge hub by ID' })
  findOne(@Param('id') id: string) {
    return this.edgeHubsService.findOne(+id);
  }

  @Get(':hubId/content')
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
  @ApiOperation({ summary: 'Assign content to hub' })
  @ApiResponse({ status: 200, description: 'Content assigned successfully' })
  assignContent(@Param('hubId') hubId: string, @Param('contentId') contentId: string) {
    return this.edgeHubsService.assignContentToHub(hubId, contentId);
  }

  @Delete(':hubId/content/:contentId')
  @ApiOperation({ summary: 'Unassign content from hub' })
  @ApiResponse({ status: 200, description: 'Content unassigned successfully' })
  unassignContent(@Param('hubId') hubId: string, @Param('contentId') contentId: string) {
    return this.edgeHubsService.unassignContentFromHub(hubId, contentId);
  }

  @Get(':hubId/sync')
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
  @ApiOperation({ summary: 'Update edge hub' })
  update(@Param('id') id: string, @Body() updateEdgeHubDto: any) {
    return this.edgeHubsService.update(+id, updateEdgeHubDto);
  }

  @Post(':hubId/metrics')
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

  @Delete(':id')
  @ApiOperation({ summary: 'Delete edge hub' })
  remove(@Param('id') id: string) {
    return this.edgeHubsService.remove(+id);
  }
}