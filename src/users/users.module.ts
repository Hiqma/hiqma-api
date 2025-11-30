import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Author, Content } from '../database/entities';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Author, Content])],
  providers: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}