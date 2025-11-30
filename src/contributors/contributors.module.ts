import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContributorApplication, User, Author } from '../database/entities';
import { ContributorsService } from './contributors.service';
import { ContributorsController } from './contributors.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ContributorApplication, User, Author])],
  providers: [ContributorsService],
  controllers: [ContributorsController],
})
export class ContributorsModule {}