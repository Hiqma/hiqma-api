import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';

describe('Hiqma Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Endpoints', () => {
    it('/health (GET)', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBeDefined();
          expect(res.body.timestamp).toBeDefined();
        });
    });

    it('/health/database (GET)', () => {
      return request(app.getHttpServer())
        .get('/health/database')
        .expect(200);
    });
  });

  describe('Content API', () => {
    it('/content (GET)', () => {
      return request(app.getHttpServer())
        .get('/content')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('/content/country/:code (GET)', () => {
      return request(app.getHttpServer())
        .get('/content/country/KE')
        .expect(200);
    });
  });

  describe('Countries API', () => {
    it('/countries (GET)', () => {
      return request(app.getHttpServer())
        .get('/countries')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('Authors API', () => {
    it('/authors (GET)', () => {
      return request(app.getHttpServer())
        .get('/authors')
        .expect(200);
    });
  });
});