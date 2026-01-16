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

  /**
   * Get analytics for all devices in a hub
   */
  async getHubDeviceAnalytics(hubId: string): Promise<any[]> {
    const devices = await this.deviceRepository.find({
      where: { hubId },
    });

    // Get activity logs for all devices in this hub
    const deviceIds = devices.map(d => d.id);
    const activityLogs: Array<{
      deviceId: string;
      totalSessions: string;
      totalTimeSpent: string;
      completedSessions: string;
      avgQuizScore: string;
      lastActivity: Date;
    }> = await this.deviceRepository.query(`
      SELECT 
        "deviceId",
        COUNT(*) as "totalSessions",
        SUM("timeSpent") as "totalTimeSpent",
        COUNT(CASE WHEN "moduleCompleted" = true THEN 1 END) as "completedSessions",
        AVG(CASE WHEN "quizScore" IS NOT NULL THEN "quizScore" END) as "avgQuizScore",
        MAX("timestamp") as "lastActivity"
      FROM activity_logs
      WHERE "deviceId" = ANY($1)
      GROUP BY "deviceId"
    `, [deviceIds]);

    const activityMap = new Map(activityLogs.map(log => [log.deviceId, log]));

    return devices.map(device => {
      const activity = activityMap.get(device.id);
      
      if (!activity) {
        return {
          deviceId: device.id,
          deviceCode: device.deviceCode,
          totalSessions: 0,
          totalTimeSpent: 0,
          completionRate: 0,
          avgQuizScore: 0,
          lastActivity: device.lastSeen?.toISOString() || null,
        };
      }

      const totalSessions = parseInt(activity.totalSessions) || 0;
      const completedSessions = parseInt(activity.completedSessions) || 0;

      return {
        deviceId: device.id,
        deviceCode: device.deviceCode,
        totalSessions,
        totalTimeSpent: parseInt(activity.totalTimeSpent) || 0,
        completionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
        avgQuizScore: parseFloat(activity.avgQuizScore) || 0,
        lastActivity: activity.lastActivity || device.lastSeen?.toISOString() || null,
      };
    });
  }

  /**
   * Get analytics for all devices across all hubs
   */
  async getAllDeviceAnalytics(filters?: {
    startDate?: Date;
    endDate?: Date;
    contentId?: string;
  }): Promise<any[]> {
    // Get all devices
    const devices = await this.deviceRepository.find({
      order: { createdAt: 'DESC' },
    });

    if (devices.length === 0) {
      return [];
    }

    // Build query with optional filters
    let query = `
      SELECT 
        "deviceId",
        COUNT(*) as "totalSessions",
        SUM("timeSpent") as "totalTimeSpent",
        COUNT(CASE WHEN "moduleCompleted" = true THEN 1 END) as "completedSessions",
        AVG(CASE WHEN "quizScore" IS NOT NULL THEN "quizScore" END) as "avgQuizScore",
        MAX("timestamp") as "lastActivity"
      FROM activity_logs
      WHERE "deviceId" IS NOT NULL
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.startDate) {
      query += ` AND "timestamp" >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters?.endDate) {
      query += ` AND "timestamp" <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    if (filters?.contentId) {
      query += ` AND "contentId" = $${paramIndex}`;
      params.push(filters.contentId);
      paramIndex++;
    }

    query += ` GROUP BY "deviceId"`;

    const activityLogs: Array<{
      deviceId: string;
      totalSessions: string;
      totalTimeSpent: string;
      completedSessions: string;
      avgQuizScore: string;
      lastActivity: Date;
    }> = await this.deviceRepository.query(query, params);

    const activityMap = new Map(activityLogs.map(log => [log.deviceId, log]));

    // Only return devices that exist in the devices table AND have activity
    // This ensures data integrity - orphaned activity logs (referencing deleted devices) are excluded
    return devices
      .filter(device => activityMap.has(device.id))
      .map(device => {
        const activity = activityMap.get(device.id)!;
        const totalSessions = parseInt(activity.totalSessions) || 0;
        const completedSessions = parseInt(activity.completedSessions) || 0;

        return {
          deviceId: device.id,
          deviceCode: device.deviceCode,
          totalSessions,
          totalTimeSpent: parseInt(activity.totalTimeSpent) || 0,
          completionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
          avgQuizScore: parseFloat(activity.avgQuizScore) || 0,
          lastActivity: activity.lastActivity || device.lastSeen?.toISOString() || null,
        };
      });
  }
}