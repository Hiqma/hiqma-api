import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgeGroup } from '../database/entities';
import { AgeGroupsController } from './age-groups.controller';
import { AgeGroupsService } from './age-groups.service';

@Module({
  imports: [TypeOrmModule.forFeature([AgeGroup])],
  controllers: [AgeGroupsController],
  providers: [AgeGroupsService],
  exports: [AgeGroupsService],
})
export class AgeGroupsModule {}