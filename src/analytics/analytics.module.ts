import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLog, Content, User, EdgeHub, Device, Student } from '../database/entities';
import { AnalyticsService } from './analytics.service';
import { AdvancedAnalyticsService } from './advanced-analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityLog, Content, User, EdgeHub, Device, Student])],
  providers: [AnalyticsService, AdvancedAnalyticsService],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}