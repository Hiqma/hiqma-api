import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Observable, firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiKeyGuard } from './api-key.guard';

@Injectable()
export class FlexibleAuthGuard implements CanActivate {
  private readonly logger = new Logger(FlexibleAuthGuard.name);

  constructor(
    private jwtAuthGuard: JwtAuthGuard,
    private apiKeyGuard: ApiKeyGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    this.logger.log(`FlexibleAuthGuard - Request URL: ${request.url}, Method: ${request.method}`);
    
    // Check if API key is provided
    const apiKey = request.headers['x-api-key'];
    if (apiKey) {
      this.logger.log('FlexibleAuthGuard - Using API key authentication');
      // Use API key authentication
      return this.apiKeyGuard.canActivate(context);
    }
    
    // Check if Authorization header with Bearer token is provided
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // If it looks like a JWT (has dots), use JWT auth
      if (token.includes('.')) {
        this.logger.log('FlexibleAuthGuard - Using JWT authentication');
        const result = this.jwtAuthGuard.canActivate(context);
        return this.resolveGuardResult(result);
      } else {
        this.logger.log('FlexibleAuthGuard - Using API key from Authorization header');
        // Otherwise treat as API key
        return this.apiKeyGuard.canActivate(context);
      }
    }
    
    this.logger.log('FlexibleAuthGuard - No API key or JWT found, defaulting to JWT authentication');
    // Default to JWT authentication
    const result = this.jwtAuthGuard.canActivate(context);
    return this.resolveGuardResult(result);
  }

  private async resolveGuardResult(result: boolean | Promise<boolean> | Observable<boolean>): Promise<boolean> {
    if (result instanceof Promise) {
      return await result;
    } else if (result instanceof Observable) {
      return await firstValueFrom(result);
    } else {
      return result;
    }
  }
}