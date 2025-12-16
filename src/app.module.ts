import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User, Content, ActivityLog, Country, Author, ContributorApplication, Category, AgeGroup, EdgeHub, ContentAuthor, ContentCategory, HubContent, Device, Student } from './database/entities';
import { AuthModule } from './auth/auth.module';
import { ContentModule } from './content/content.module';
import { SyncModule } from './sync/sync.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ContributorsModule } from './contributors/contributors.module';
import { AuthorsModule } from './authors/authors.module';
import { CountriesModule } from './countries/countries.module';
import { CategoriesModule } from './categories/categories.module';
import { AgeGroupsModule } from './age-groups/age-groups.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { TestingModule } from './testing/testing.module';
import { EdgeHubsModule } from './edge-hubs/edge-hubs.module';
import { DevicesModule } from './devices/devices.module';
import { StudentsModule } from './students/students.module';
import { SecurityModule } from './security/security.module';
import { UploadModule } from './upload/upload.module';
import { RedocController } from './docs/redoc.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DATABASE_HOST'),
        port: config.get('DATABASE_PORT'),
        username: config.get('DATABASE_USER'),
        password: config.get('DATABASE_PASSWORD'),
        database: config.get('DATABASE_NAME'),
        entities: [User, Content, ActivityLog, Country, Author, ContributorApplication, Category, AgeGroup, EdgeHub, ContentAuthor, ContentCategory, HubContent, Device, Student],
        synchronize: true,
      }),
    }),
    AuthModule,
    ContentModule,
    SyncModule,
    AnalyticsModule,
    ContributorsModule,
    AuthorsModule,
    CountriesModule,
    CategoriesModule,
    AgeGroupsModule,
    UsersModule,
    HealthModule,
    TestingModule,
    EdgeHubsModule,
    DevicesModule,
    StudentsModule,
    SecurityModule,
    UploadModule,
  ],
  controllers: [AppController, RedocController],
  providers: [AppService],
})
export class AppModule {}
