import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private requests = new Map<string, { count: number; resetTime: number }>();
  private readonly maxRequests = 100; // requests per window
  private readonly windowMs = 15 * 60 * 1000; // 15 minutes

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const clientId = this.getClientId(request);
    
    const now = Date.now();
    const clientData = this.requests.get(clientId);

    if (!clientData || now > clientData.resetTime) {
      // Reset or initialize
      this.requests.set(clientId, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }

    if (clientData.count >= this.maxRequests) {
      throw new HttpException(
        'Too many requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    clientData.count++;
    return true;
  }

  private getClientId(request: any): string {
    // Use IP address as client identifier
    return request.ip || request.connection.remoteAddress || 'unknown';
  }

  // Cleanup old entries periodically
  cleanup() {
    const now = Date.now();
    for (const [clientId, data] of this.requests.entries()) {
      if (now > data.resetTime) {
        this.requests.delete(clientId);
      }
    }
  }
}