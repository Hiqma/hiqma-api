import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Content } from '../database/entities';

@Injectable()
export class HealthService {
  constructor(
    @InjectRepository(Content)
    private contentRepository: Repository<Content>,
  ) {}

  async getSystemHealth() {
    const dbHealth = await this.getDatabaseHealth();
    const syncHealth = await this.getSyncHealth();
    
    return {
      status: dbHealth.healthy && syncHealth.healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        sync: syncHealth,
      },
    };
  }

  async getDatabaseHealth() {
    try {
      await this.contentRepository.count();
      return { healthy: true, message: 'Database connection successful' };
    } catch (error) {
      return { healthy: false, message: 'Database connection failed', error: error.message };
    }
  }

  async getSyncHealth() {
    try {
      const recentContent = await this.contentRepository.find({
        take: 1,
        order: { createdAt: 'DESC' },
      });
      
      return {
        healthy: true,
        message: 'Sync service operational',
        lastSync: recentContent[0]?.createdAt || null,
      };
    } catch (error) {
      return { healthy: false, message: 'Sync service error', error: error.message };
    }
  }
}