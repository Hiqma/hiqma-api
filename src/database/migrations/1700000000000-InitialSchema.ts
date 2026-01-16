import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create all tables without foreign key constraints first
    // This allows for flexible data insertion order

    // Users table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        "firstName" character varying,
        "lastName" character varying,
        "role" character varying NOT NULL DEFAULT 'contributor',
        "permissions" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    // Countries table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "countries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "code" character varying NOT NULL,
        "region" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_countries_code" UNIQUE ("code"),
        CONSTRAINT "PK_countries" PRIMARY KEY ("id")
      )
    `);

    // Age Groups table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "age_groups" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "minAge" integer NOT NULL,
        "maxAge" integer NOT NULL,
        "description" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_age_groups_name" UNIQUE ("name"),
        CONSTRAINT "PK_age_groups" PRIMARY KEY ("id")
      )
    `);

    // Categories table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_categories_name" UNIQUE ("name"),
        CONSTRAINT "PK_categories" PRIMARY KEY ("id")
      )
    `);

    // Authors table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "authors" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "bio" text,
        "nationality" character varying,
        "birthYear" integer,
        "imageUrl" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_authors" PRIMARY KEY ("id")
      )
    `);

    // Edge Hubs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "edge_hubs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "hubId" character varying NOT NULL,
        "name" character varying NOT NULL,
        "location" character varying,
        "status" character varying NOT NULL DEFAULT 'active',
        "lastSyncAt" TIMESTAMP,
        "allowAnonymousAccess" boolean NOT NULL DEFAULT true,
        "requireStudentAuthentication" boolean NOT NULL DEFAULT false,
        "authenticationMessage" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_edge_hubs_hubId" UNIQUE ("hubId"),
        CONSTRAINT "PK_edge_hubs" PRIMARY KEY ("id")
      )
    `);

    // Devices table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "devices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "hubId" character varying NOT NULL,
        "deviceCode" character varying NOT NULL,
        "name" character varying,
        "status" character varying NOT NULL DEFAULT 'active',
        "registeredAt" TIMESTAMP NOT NULL DEFAULT now(),
        "lastSeen" TIMESTAMP,
        "deviceInfo" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_devices_deviceCode" UNIQUE ("deviceCode"),
        CONSTRAINT "PK_devices" PRIMARY KEY ("id")
      )
    `);

    // Students table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "students" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "hubId" character varying NOT NULL,
        "studentCode" character varying NOT NULL,
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "grade" character varying,
        "age" integer,
        "status" character varying NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_students_studentCode" UNIQUE ("studentCode"),
        CONSTRAINT "PK_students" PRIMARY KEY ("id")
      )
    `);

    // Content table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "content" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" text,
        "body" text NOT NULL,
        "coverImage" character varying,
        "ageGroup" character varying,
        "readingLevel" character varying,
        "estimatedReadingTime" integer,
        "status" character varying NOT NULL DEFAULT 'draft',
        "contributorId" uuid,
        "reviewerId" uuid,
        "reviewNotes" text,
        "reviewedAt" TIMESTAMP,
        "publishedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_content" PRIMARY KEY ("id")
      )
    `);

    // Activity Logs table - NO FOREIGN KEY CONSTRAINTS
    // This allows analytics to be saved even if devices/students haven't synced yet
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "activity_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "hubId" character varying NOT NULL,
        "sessionId" character varying NOT NULL,
        "contentId" uuid NOT NULL,
        "timeSpent" integer NOT NULL,
        "quizScore" integer,
        "moduleCompleted" boolean NOT NULL DEFAULT false,
        "deviceId" uuid,
        "studentId" uuid,
        "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_activity_logs" PRIMARY KEY ("id")
      )
    `);

    // Contributor Applications table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "contributor_applications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "email" character varying NOT NULL,
        "country" character varying NOT NULL,
        "motivation" text NOT NULL,
        "experience" text,
        "status" character varying NOT NULL DEFAULT 'pending',
        "reviewNotes" text,
        "reviewedBy" uuid,
        "reviewedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contributor_applications" PRIMARY KEY ("id")
      )
    `);

    // Junction tables
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "content_authors" (
        "contentId" uuid NOT NULL,
        "authorId" uuid NOT NULL,
        CONSTRAINT "PK_content_authors" PRIMARY KEY ("contentId", "authorId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "content_categories" (
        "contentId" uuid NOT NULL,
        "categoryId" uuid NOT NULL,
        CONSTRAINT "PK_content_categories" PRIMARY KEY ("contentId", "categoryId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hub_content" (
        "hubId" uuid NOT NULL,
        "contentId" uuid NOT NULL,
        "assignedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hub_content" PRIMARY KEY ("hubId", "contentId")
      )
    `);

    // Create indexes for better query performance
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_activity_logs_hubId" ON "activity_logs" ("hubId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_activity_logs_deviceId" ON "activity_logs" ("deviceId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_activity_logs_studentId" ON "activity_logs" ("studentId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_activity_logs_contentId" ON "activity_logs" ("contentId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_activity_logs_timestamp" ON "activity_logs" ("timestamp")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_devices_hubId" ON "devices" ("hubId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_students_hubId" ON "students" ("hubId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_content_status" ON "content" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "hub_content"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "content_categories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "content_authors"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contributor_applications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "activity_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "content"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "students"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "devices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "edge_hubs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "authors"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "age_groups"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "countries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
