import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { Content } from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Content])],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}