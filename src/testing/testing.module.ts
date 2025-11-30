import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestingController } from './testing.controller';
import { TestDataService } from './test-data.service';
import { User, Content, Author, Country } from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([User, Content, Author, Country])],
  controllers: [TestingController],
  providers: [TestDataService],
})
export class TestingModule {}