import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EdgeHubsService } from './edge-hubs.service';

@Controller('edge-hubs')
export class EdgeHubsController {
  constructor(private readonly edgeHubsService: EdgeHubsService) {}

  @Post()
  create(@Body() createEdgeHubDto: any) {
    return this.edgeHubsService.create(createEdgeHubDto);
  }

  @Get()
  findAll() {
    return this.edgeHubsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.edgeHubsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEdgeHubDto: any) {
    return this.edgeHubsService.update(+id, updateEdgeHubDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.edgeHubsService.remove(+id);
  }
}