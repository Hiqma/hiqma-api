import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Content, ActivityLog } from '../database/entities';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Content, ActivityLog])],
  providers: [SyncService],
  controllers: [SyncController],
})
export class SyncModule {}