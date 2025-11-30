import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Author } from '../database/entities';
import { AuthorsService } from './authors.service';
import { AuthorsController } from './authors.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Author])],
  providers: [AuthorsService],
  controllers: [AuthorsController],
})
export class AuthorsModule {}