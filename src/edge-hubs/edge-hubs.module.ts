import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EdgeHubsService } from './edge-hubs.service';
import { EdgeHubsController } from './edge-hubs.controller';
import { EdgeHub, HubContent, Content, Device, Student } from '../database/entities';
import { SecurityModule } from '../security/security.module';
import { AuthModule } from '../auth/auth.module';
import { StudentsService } from '../students/students.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EdgeHub, HubContent, Content, Device, Student]),
    SecurityModule,
    AuthModule,
  ],
  controllers: [EdgeHubsController],
  providers: [EdgeHubsService, StudentsService],
  exports: [EdgeHubsService],
})
export class EdgeHubsModule {}