import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuditLoggerService } from './audit-logger.service';
import { AccessControlService } from './access-control.service';

@ApiTags('Audit Logs')
@Controller('audit')
export class AuditController {
  constructor(
    private auditLogger: AuditLoggerService,
    private accessControl: AccessControlService,
  ) {}

  @Get('logs')
  @ApiOperation({ summary: 'Get audit logs with filtering' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  @ApiQuery({ name: 'resource', required: false, description: 'Filter by resource type' })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by action' })
  @ApiQuery({ name: 'hubId', required: false, description: 'Filter by hub ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date (ISO string)' })
  @ApiQuery({ name: 'sensitiveData', required: false, description: 'Filter by sensitive data flag' })
  @ApiQuery({ name: 'success', required: false, description: 'Filter by success status' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results (default: 100)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination (default: 0)' })
  async getAuditLogs(
    @Query('resource') resource?: string,
    @Query('action') action?: string,
    @Query('hubId') hubId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sensitiveData') sensitiveData?: string,
    @Query('success') success?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Request() req?: any,
  ) {
    // Check access control
    const context = {
      userType: 'admin' as const, // In real implementation, get from JWT token
      userId: req?.user?.id,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
    };

    await this.accessControl.enforceAccess(context, 'audit', 'view');

    const filters = {
      resource,
      action,
      hubId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      sensitiveData: sensitiveData ? sensitiveData === 'true' : undefined,
      success: success ? success === 'true' : undefined,
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0,
    };

    const result = await this.auditLogger.getAuditLogs(filters);

    return {
      logs: result.logs.map(log => ({
        ...log,
        // Sanitize sensitive details for API response
        details: log.sensitiveData ? '[REDACTED]' : log.details,
      })),
      total: result.total,
      filters,
    };
  }

  @Get('compliance-report')
  @ApiOperation({ summary: 'Get compliance report' })
  @ApiResponse({ status: 200, description: 'Compliance report generated successfully' })
  @ApiQuery({ name: 'hubId', required: false, description: 'Filter by hub ID' })
  async getComplianceReport(
    @Query('hubId') hubId?: string,
    @Request() req?: any,
  ) {
    // Check access control
    const context = {
      userType: 'admin' as const, // In real implementation, get from JWT token
      userId: req?.user?.id,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
    };

    await this.accessControl.enforceAccess(context, 'audit', 'view');

    const report = await this.auditLogger.getComplianceReport(hubId);

    return {
      ...report,
      generatedAt: new Date(),
      hubId: hubId || 'all',
      complianceRequirements: {
        coppa: this.accessControl.getCOPPARequirements(),
        gdpr: this.accessControl.getGDPRRequirements(),
      },
      dataRetentionPolicy: this.accessControl.getDataRetentionPolicy(),
    };
  }

  @Get('security-stats')
  @ApiOperation({ summary: 'Get security statistics' })
  @ApiResponse({ status: 200, description: 'Security statistics retrieved successfully' })
  async getSecurityStats(@Request() req?: any) {
    // Check access control
    const context = {
      userType: 'admin' as const, // In real implementation, get from JWT token
      userId: req?.user?.id,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
    };

    await this.accessControl.enforceAccess(context, 'audit', 'view');

    const complianceReport = await this.auditLogger.getComplianceReport();
    
    // Get recent failed authentication attempts
    const recentFailures = await this.auditLogger.getAuditLogs({
      resource: 'authentication',
      success: false,
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      limit: 50,
    });

    // Get recent sensitive data access
    const sensitiveDataAccess = await this.auditLogger.getAuditLogs({
      sensitiveData: true,
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      limit: 50,
    });

    return {
      overview: {
        totalAuditEvents: complianceReport.totalEvents,
        sensitiveDataEvents: complianceReport.sensitiveDataEvents,
        failedEvents: complianceReport.failedEvents,
        complianceFlags: complianceReport.complianceFlags,
      },
      recentActivity: {
        failedAuthentications: recentFailures.total,
        sensitiveDataAccess: sensitiveDataAccess.total,
        recentFailures: recentFailures.logs.slice(0, 10),
        recentSensitiveAccess: sensitiveDataAccess.logs.slice(0, 10),
      },
      generatedAt: new Date(),
    };
  }
}