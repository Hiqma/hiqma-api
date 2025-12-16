import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, BadRequestException, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DevicesService } from './devices.service';

class CreateDevicesDto {
  deviceCount: number;
}

class RegisterDeviceDto {
  deviceCode: string;
  deviceInfo?: {
    model?: string;
    osVersion?: string;
    appVersion?: string;
  };
}

@ApiTags('Devices')
@Controller('devices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DevicesController {
  constructor(private devicesService: DevicesService) {}

  @Post('hubs/:hubId/devices')
  @ApiOperation({ summary: 'Create devices for hub with specified count' })
  @ApiResponse({ status: 201, description: 'Devices created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid device count or hub not found' })
  @ApiBody({
    type: CreateDevicesDto,
    examples: {
      example1: {
        summary: 'Create 5 devices',
        value: { deviceCount: 5 }
      }
    }
  })
  async createDevicesForHub(@Param('hubId') hubId: string, @Body() data: CreateDevicesDto) {
    try {
      return await this.devicesService.createDevicesForHub(hubId, data.deviceCount);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('hubs/:hubId/devices')
  @ApiOperation({ summary: 'Retrieve all devices for hub' })
  @ApiResponse({ 
    status: 200, 
    description: 'Devices retrieved successfully',
    example: {
      devices: [{
        id: 'device-123',
        hubId: 'hub-456',
        deviceCode: 'ABC123',
        name: null,
        status: 'pending',
        registeredAt: null,
        lastSeen: null,
        createdAt: '2023-01-01T00:00:00Z'
      }],
      total: 1,
      page: 1,
      totalPages: 1
    }
  })
  async getDevicesForHub(@Param('hubId') hubId: string) {
    const devices = await this.devicesService.getDevicesForHub(hubId);
    return {
      devices,
      total: devices.length,
      page: 1,
      totalPages: 1
    };
  }

  @Get(':deviceId')
  @ApiOperation({ summary: 'Get device by ID' })
  @ApiResponse({ status: 200, description: 'Device retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async getDevice(@Param('deviceId') deviceId: string) {
    return await this.devicesService.getDevice(deviceId);
  }

  @Put(':deviceId/regenerate')
  @ApiOperation({ summary: 'Regenerate device code' })
  @ApiResponse({ status: 200, description: 'Device code regenerated successfully' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async regenerateDeviceCode(@Param('deviceId') deviceId: string) {
    try {
      return await this.devicesService.regenerateDeviceCode(deviceId);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete(':deviceId')
  @ApiOperation({ summary: 'Remove device from hub' })
  @ApiResponse({ status: 200, description: 'Device removed successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete registered device' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async removeDevice(@Param('deviceId') deviceId: string) {
    try {
      await this.devicesService.removeDevice(deviceId);
      return { message: 'Device removed successfully' };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('register')
  @ApiOperation({ summary: 'Register device with device code (for mobile apps)' })
  @ApiResponse({ status: 200, description: 'Device registered successfully' })
  @ApiResponse({ status: 404, description: 'Invalid device code' })
  @ApiBody({
    type: RegisterDeviceDto,
    examples: {
      example1: {
        summary: 'Register device',
        value: {
          deviceCode: 'ABC123',
          deviceInfo: {
            model: 'iPad Air',
            osVersion: 'iOS 17.0',
            appVersion: '1.0.0'
          }
        }
      }
    }
  })
  async registerDevice(@Body() data: RegisterDeviceDto) {
    try {
      return await this.devicesService.updateDeviceRegistration(data.deviceCode, data.deviceInfo);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate device code' })
  @ApiResponse({ status: 200, description: 'Device code validation result' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        deviceCode: { type: 'string', example: 'ABC123' }
      }
    }
  })
  async validateDeviceCode(@Body() data: { deviceCode: string }) {
    const device = await this.devicesService.validateDeviceCode(data.deviceCode);
    return {
      valid: !!device,
      device: device || null
    };
  }

  @Get('hubs/:hubId/devices/export')
  @ApiOperation({ summary: 'Export device codes for hub as CSV' })
  @ApiResponse({ status: 200, description: 'Device codes exported successfully' })
  async exportDeviceCodes(@Param('hubId') hubId: string, @Res() res: Response) {
    const csvData = await this.devicesService.exportDeviceCodes(hubId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="hub-${hubId}-devices.csv"`);
    res.send(csvData);
  }

  @Get('hubs/:hubId/devices/stats')
  @ApiOperation({ summary: 'Get device statistics for hub' })
  @ApiResponse({ 
    status: 200, 
    description: 'Device statistics retrieved successfully',
    example: {
      total: 50,
      active: 30,
      registered: 15,
      inactive: 5
    }
  })
  async getHubDeviceStats(@Param('hubId') hubId: string) {
    return await this.devicesService.getHubDeviceStats(hubId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get device code statistics' })
  @ApiResponse({ 
    status: 200, 
    description: 'Device code statistics retrieved successfully',
    example: {
      totalCodes: 150,
      activeDevices: 120,
      pendingDevices: 25,
      inactiveDevices: 5,
      codeCollisionRate: 0.02
    }
  })
  async getDeviceCodeStats() {
    return await this.devicesService.getDeviceCodeStats();
  }
}