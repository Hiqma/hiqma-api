import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from './database/entities/user.entity';
import { Content } from './database/entities/content.entity';
import { ActivityLog } from './database/entities/activity-log.entity';
import { Country } from './database/entities/country.entity';
import { Author } from './database/entities/author.entity';
import { ContributorApplication } from './database/entities/contributor-application.entity';
import { Category } from './database/entities/category.entity';
import { AgeGroup } from './database/entities/age-group.entity';
import { EdgeHub } from './database/entities/edge-hub.entity';
import { ContentAuthor } from './database/entities/content-author.entity';
import { ContentCategory } from './database/entities/content-category.entity';
import { HubContent } from './database/entities/hub-content.entity';
import { Device } from './database/entities/device.entity';
import { Student } from './database/entities/student.entity';

// Load environment variables
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'hiqma',
  entities: [
    User,
    Content,
    ActivityLog,
    Country,
    Author,
    ContributorApplication,
    Category,
    AgeGroup,
    EdgeHub,
    ContentAuthor,
    ContentCategory,
    HubContent,
    Device,
    Student,
  ],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: true,
});
