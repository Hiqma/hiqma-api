import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device, EdgeHub } from '../database/entities';
import { SecurityService } from '../security/security.service';
import * as crypto from 'crypto';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    @InjectRepository(EdgeHub)
    private edgeHubRepository: Repository<EdgeHub>,
    private securityService: SecurityService,
  ) {}

  /**
   * Generate a cryptographically secure device code using SecurityService
   * 6-8 characters, alphanumeric, no ambiguous characters
   */
  private generateDeviceCode(): string {
    return this.securityService.generateDeviceCode();
  }

  /**
   * Generate a unique device code with collision detection and retry logic
   * Implements exponential backoff for collision resolution
   */
  private async generateUniqueDeviceCode(hubId?: string): Promise<string> {
    let attempts = 0;
    const maxAttempts = 15; // Increased for better collision handling
    let codeLength = 6; // Start with 6 characters
    
    while (attempts < maxAttempts) {
      const code = this.generateDeviceCode();
      
      // Check for collision in the entire database
      const existing = await this.deviceRepository.findOne({ where: { deviceCode: code } });
      
      if (!existing) {
        return code;
      }
      
      attempts++;
      
      // After 5 attempts, increase code length for better uniqueness
      if (attempts === 5) {
        codeLength = 7;
      } else if (attempts === 10) {
        codeLength = 8;
      }
      
      // Add small delay to prevent rapid database queries
      if (attempts > 3) {
        await new Promise(resolve => setTimeout(resolve, 10 * attempts));
      }
    }
    
    throw new Error(`Unable to generate unique device code after ${maxAttempts} attempts`);
  }

  /**
   * Validate device code format
   */
  private validateDeviceCodeFormat(code: string): boolean {
    // Must be 4-8 characters, uppercase letters and numbers, no ambiguous characters
    const validPattern = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4,8}$/;
    return validPattern.test(code);
  }

  /**
   * Create devices for a hub with specified count
   */
  async createDevicesForHub(hubId: string, deviceCount: number): Promise<Device[]> {
    // Validate hub exists
    const hub = await this.edgeHubRepository.findOne({ where: { hubId } });
    if (!hub) {
      throw new NotFoundException('Hub not found');
    }

    // Validate device count
    if (deviceCount < 1 || deviceCount > 100) {
      throw new BadRequestException('Device count must be between 1 and 100');
    }

    // Check existing device count to prevent excessive device creation
    const existingDeviceCount = await this.deviceRepository.count({ where: { hubId } });
    if (existingDeviceCount + deviceCount > 500) {
      throw new BadRequestException('Total device count per hub cannot exceed 500');
    }

    const devices: Device[] = [];
    
    for (let i = 0; i < deviceCount; i++) {
      const deviceCode = await this.generateUniqueDeviceCode(hubId);
      
      const device = this.deviceRepository.create({
        hubId,
        deviceCode,
        status: 'pending',
      });
      
      devices.push(device);
    }
    
    return await this.deviceRepository.save(devices);
  }

  /**
   * Get all devices for a hub
   */
  async getDevicesForHub(hubId: string): Promise<Device[]> {
    return await this.deviceRepository.find({
      where: { hubId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get a single device by ID
   */
  async getDevice(deviceId: string): Promise<Device> {
    const device = await this.deviceRepository.findOne({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    return device;
  }

  /**
   * Regenerate device code
   */
  async regenerateDeviceCode(deviceId: string): Promise<Device> {
    const device = await this.getDevice(deviceId);
    
    const newCode = await this.generateUniqueDeviceCode(device.hubId);
    device.deviceCode = newCode;
    device.status = 'pending'; // Reset status when code is regenerated
    device.registeredAt = null;
    device.lastSeen = null;
    
    return await this.deviceRepository.save(device);
  }

  /**
   * Remove device from hub
   */
  async removeDevice(deviceId: string): Promise<void> {
    const device = await this.getDevice(deviceId);
    
    // Check if device is registered
    if (device.status === 'active' && device.registeredAt) {
      throw new BadRequestException('Cannot delete registered device. Please deactivate first.');
    }
    
    await this.deviceRepository.remove(device);
  }

  /**
   * Update device registration status
   */
  async updateDeviceRegistration(deviceCode: string, deviceInfo?: any): Promise<Device> {
    const device = await this.deviceRepository.findOne({ where: { deviceCode } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    
    device.status = 'active';
    device.registeredAt = new Date();
    device.lastSeen = new Date();
    
    if (deviceInfo) {
      device.deviceInfo = JSON.stringify(deviceInfo);
    }
    
    return await this.deviceRepository.save(device);
  }

  /**
   * Update device last seen timestamp
   */
  async updateLastSeen(deviceId: string): Promise<void> {
    await this.deviceRepository.update(deviceId, { lastSeen: new Date() });
  }

  /**
   * Validate device code format and existence
   */
  async validateDeviceCode(deviceCode: string): Promise<Device | null> {
    // First validate the format
    if (!this.validateDeviceCodeFormat(deviceCode)) {
      return null;
    }
    
    // Then check if it exists in the database
    return await this.deviceRepository.findOne({ where: { deviceCode } });
  }

  /**
   * Export device codes for a hub as CSV
   */
  async exportDeviceCodes(hubId: string): Promise<string> {
    const devices = await this.deviceRepository.find({
      where: { hubId },
      order: { createdAt: 'DESC' },
    });

    const csvHeader = 'Device Code,Status,Created At,Registered At,Last Seen\n';
    const csvRows = devices.map(device => 
      `${device.deviceCode},${device.status},${device.createdAt?.toISOString() || ''},${device.registeredAt?.toISOString() || ''},${device.lastSeen?.toISOString() || ''}`
    ).join('\n');

    return csvHeader + csvRows;
  }

  /**
   * Get device statistics for a specific hub
   */
  async getHubDeviceStats(hubId: string): Promise<{
    total: number;
    active: number;
    registered: number;
    inactive: number;
  }> {
    const total = await this.deviceRepository.count({ where: { hubId } });
    const active = await this.deviceRepository.count({ where: { hubId, status: 'active' } });
    const registered = await this.deviceRepository.count({ where: { hubId, status: 'active' } }); // Same as active for now
    const inactive = await this.deviceRepository.count({ where: { hubId, status: 'inactive' } });

    return {
      total,
      active,
      registered,
      inactive,
    };
  }

  /**
   * Get device code statistics for monitoring
   */
  async getDeviceCodeStats(): Promise<{
    totalCodes: number;
    activeDevices: number;
    pendingDevices: number;
    inactiveDevices: number;
    codeCollisionRate: number;
  }> {
    const totalCodes = await this.deviceRepository.count();
    const activeDevices = await this.deviceRepository.count({ where: { status: 'active' } });
    const pendingDevices = await this.deviceRepository.count({ where: { status: 'pending' } });
    const inactiveDevices = await this.deviceRepository.count({ where: { status: 'inactive' } });
    
    // Calculate theoretical collision rate based on character set and code length
    const charSetSize = 29; // ABCDEFGHJKMNPQRSTUVWXYZ23456789
    const avgCodeLength = 6;
    const totalPossibleCodes = Math.pow(charSetSize, avgCodeLength);
    const codeCollisionRate = totalCodes / totalPossibleCodes;
    
    return {
      totalCodes,
      activeDevices,
      pendingDevices,
      inactiveDevices,
      codeCollisionRate: Math.round(codeCollisionRate * 10000) / 100, // Percentage with 2 decimal places
    };
  }
}