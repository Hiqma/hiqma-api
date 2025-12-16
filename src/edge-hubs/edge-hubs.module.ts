import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EdgeHubsService } from './edge-hubs.service';
import { EdgeHubsController } from './edge-hubs.controller';
import { EdgeHub, HubContent, Content, Device, Student } from '../database/entities';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EdgeHub, HubContent, Content, Device, Student]),
    SecurityModule,
  ],
  controllers: [EdgeHubsController],
  providers: [EdgeHubsService],
  exports: [EdgeHubsService],
})
export class EdgeHubsModule {}