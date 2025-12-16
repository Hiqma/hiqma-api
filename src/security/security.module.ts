import { Module } from '@nestjs/common';
import { SecurityService } from './security.service';
import { RateLimiterService } from './rate-limiter.service';
import { AuditLoggerService } from './audit-logger.service';
import { AccessControlService } from './access-control.service';
import { AuditController } from './audit.controller';

@Module({
  providers: [SecurityService, RateLimiterService, AuditLoggerService, AccessControlService],
  controllers: [AuditController],
  exports: [SecurityService, RateLimiterService, AuditLoggerService, AccessControlService],
})
export class SecurityModule {}