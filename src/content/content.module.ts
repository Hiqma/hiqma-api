import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Content, Author, ContentAuthor, ContentCategory, Category, AgeGroup } from '../database/entities';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { QuestionValidationService } from './question-validation.service';
import { ContentSanitizerService } from '../security/content-sanitizer.service';

@Module({
  imports: [TypeOrmModule.forFeature([Content, Author, ContentAuthor, ContentCategory, Category, AgeGroup])],
  providers: [ContentService, QuestionValidationService, ContentSanitizerService],
  controllers: [ContentController],
})
export class ContentModule {}