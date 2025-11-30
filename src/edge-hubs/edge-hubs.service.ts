import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EdgeHub } from '../database/entities';
import * as crypto from 'crypto';

@Injectable()
export class EdgeHubsService {
  constructor(
    @InjectRepository(EdgeHub)
    private edgeHubRepository: Repository<EdgeHub>,
  ) {}

  async findAll() {
    return this.edgeHubRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  async findOne(id: number) {
    return this.edgeHubRepository.findOne({ where: { id } });
  }

  async create(createEdgeHubDto: any) {
    const hubId = this.generateHubId();
    const encryptionKey = this.generateEncryptionKey();
    
    const edgeHub = this.edgeHubRepository.create({
      ...createEdgeHubDto,
      hubId,
      encryptionKey,
    });
    
    return this.edgeHubRepository.save(edgeHub);
  }

  async update(id: number, updateEdgeHubDto: any) {
    await this.edgeHubRepository.update(id, updateEdgeHubDto);
    return this.findOne(id);
  }

  async remove(id: number) {
    return this.edgeHubRepository.delete(id);
  }

  private generateHubId(): string {
    return `HUB-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
  }

  private generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}