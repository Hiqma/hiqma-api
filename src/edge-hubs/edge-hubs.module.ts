import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EdgeHubsService } from './edge-hubs.service';
import { EdgeHubsController } from './edge-hubs.controller';
import { EdgeHub } from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([EdgeHub])],
  controllers: [EdgeHubsController],
  providers: [EdgeHubsService],
  exports: [EdgeHubsService],
})
export class EdgeHubsModule {}