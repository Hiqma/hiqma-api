import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] || request.headers['authorization']?.replace('Bearer ', '');
    
    this.logger.log(`API Key Guard - Received headers: ${JSON.stringify({
      'x-api-key': request.headers['x-api-key'] ? `${request.headers['x-api-key'].substring(0, 10)}...` : 'NOT SET',
      'authorization': request.headers['authorization'] ? `${request.headers['authorization'].substring(0, 20)}...` : 'NOT SET'
    })}`);
    
    if (!apiKey) {
      this.logger.warn('API key is missing from request');
      throw new UnauthorizedException('API key is required');
    }

    // Get the expected API key from environment variables
    const expectedApiKey = this.configService.get<string>('EDGE_HUB_API_KEY');
    
    this.logger.log(`Expected API key: ${expectedApiKey ? `${expectedApiKey.substring(0, 10)}...` : 'NOT CONFIGURED'}`);
    
    if (!expectedApiKey) {
      this.logger.error('EDGE_HUB_API_KEY not configured in environment');
      throw new UnauthorizedException('API key authentication not configured');
    }

    if (apiKey !== expectedApiKey) {
      this.logger.warn(`API key mismatch - received: ${apiKey.substring(0, 10)}..., expected: ${expectedApiKey.substring(0, 10)}...`);
      throw new UnauthorizedException('Invalid API key');
    }

    this.logger.log('API key authentication successful');

    // Add system context to request for access control
    request.user = {
      id: 'system',
      role: 'system',
      userType: 'system',
      permissions: ['hub:read', 'student:read', 'device:read', 'content:read']
    };

    return true;
  }
}